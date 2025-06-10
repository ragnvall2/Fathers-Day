"""
Family Timeline Controllers
"""
import os
import json
import base64
from py4web import action, request, abort, redirect, URL, HTTP, response
from py4web.utils.form import Form, FormStyleBulma

# Import from common and models
from .common import db, session, T, cache, auth, flash
from .models import (
    create_family, get_family_by_code, 
    get_memories_by_year, get_questions_by_theme, save_memory
)

# py4web setup
@action('index')
@action.uses('index.html', db)
def index():
    """Main timeline page"""
    family_code = request.query.get('family', '')
    family = None
    
    if family_code:
        family = get_family_by_code(family_code)
        if not family:
            # Invalid family code
            redirect(URL('index'))
    
    return dict(
        family=family,
        family_code=family_code
)

@action('create_family', method='POST')
@action.uses(db)
def create_family_endpoint():
    """Create a new family timeline"""
    data = request.json
    
    if not data or 'family_name' not in data or 'created_by' not in data:
        raise HTTP(400, "Missing required fields")
    
    family_id, access_code = create_family(
        data['family_name'], 
        data['created_by']
    )
    
    return dict(
        success=True,
        family_id=family_id,
        access_code=access_code,
        redirect_url=URL('index', vars={'family': access_code})
    )

@action('api/memories/<family_code>')
@action('api/memories/<family_code>/<year>')
@action.uses(db)
def get_memories(family_code, year=None):
    """Get memories for a family, optionally filtered by year"""
    family = get_family_by_code(family_code)
    if not family:
        raise HTTP(404, "Family not found")
    
    # Convert year to int if provided
    year_int = None
    if year:
        try:
            year_int = int(year)
        except ValueError:
            raise HTTP(400, "Invalid year format")
    
    memories = get_memories_by_year(family.id, year_int)
    
    # Convert memories to JSON-serializable format
    result = []
    for memory in memories:
        memory_dict = {
            'id': memory.id,
            'year': memory.year,
            'title': memory.title,
            'author': memory.author,
            'theme': memory.theme,
            'questions_and_answers': memory.questions_and_answers or [],
            'story_text': memory.story_text,
            'created_at': memory.created_at.isoformat(),
            'has_photo': bool(memory.photo_data)
        }
        result.append(memory_dict)
    
    return dict(memories=result)

@action('api/memories/<family_code>/years')
@action.uses(db)
def get_memory_years(family_code):
    """Get all years that have memories for a family"""
    family = get_family_by_code(family_code)
    if not family:
        raise HTTP(404, "Family not found")
    
    # Get distinct years with memory counts
    rows = db().select(
        db.memories.year,
        db.memories.id.count(),
        groupby=db.memories.year,
        having=db.memories.family_id == family.id,
        orderby=db.memories.year
    )
    
    years_data = {}
    for row in rows:
        years_data[row.memories.year] = row[db.memories.id.count()]
    
    return dict(years=years_data)

@action('api/themes/<theme>/questions')
@action.uses(db)
def get_theme_questions(theme):
    """Get all questions for a specific theme"""
    questions = get_questions_by_theme(theme)
    
    result = []
    for q in questions:
        result.append({
            'id': q.id,
            'text': q.question_text,
            'order': q.order_index
        })
    
    return dict(questions=result)

@action('api/memories', method='POST')
@action.uses(db)
def save_memory_endpoint():
    """Save a new memory"""
    data = request.json
    
    # Validate required fields
    required_fields = ['family_code', 'year', 'title', 'author', 'theme', 'story_text']
    for field in required_fields:
        if field not in data:
            raise HTTP(400, f"Missing required field: {field}")
    
    # Get family
    family = get_family_by_code(data['family_code'])
    if not family:
        raise HTTP(404, "Family not found")
    
    # Handle photo data if present
    photo_data = None
    photo_filename = None
    if 'photo_data' in data and data['photo_data']:
        try:
            # Remove data URL prefix if present
            photo_data_str = data['photo_data']
            if ',' in photo_data_str:
                photo_data_str = photo_data_str.split(',')[1]
            
            photo_data = base64.b64decode(photo_data_str)
            photo_filename = data.get('photo_filename', f"photo_{data['year']}.jpg")
        except Exception as e:
            print(f"Error processing photo: {e}")
            photo_data = None
    
    # Save memory
    memory_id = save_memory(
        family_id=family.id,
        year=data['year'],
        title=data['title'],
        author=data['author'],
        theme=data['theme'],
        questions_answers=data.get('questions_and_answers', []),
        story_text=data['story_text'],
        photo_data=photo_data,
        photo_filename=photo_filename
    )
    
    return dict(
        success=True,
        memory_id=memory_id,
        message="Memory saved successfully"
    )

@action('api/photos/<memory_id>')
@action.uses(db)
def get_photo(memory_id):
    """Get photo for a memory"""
    try:
        memory_id_int = int(memory_id)
    except ValueError:
        raise HTTP(400, "Invalid memory ID")
        
    memory = db.memories[memory_id_int]
    if not memory or not memory.photo_data:
        raise HTTP(404, "Photo not found")
    
    # Determine content type based on filename
    content_type = 'image/jpeg'  # default
    if memory.photo_filename:
        if memory.photo_filename.lower().endswith('.png'):
            content_type = 'image/png'
        elif memory.photo_filename.lower().endswith('.gif'):
            content_type = 'image/gif'
    
    response.headers['Content-Type'] = content_type
    return memory.photo_data

@action('api/themes')
@action.uses(db)
def get_all_themes():
    """Get all available themes"""
    themes = db().select(
        db.theme_questions.theme,
        distinct=True,
        orderby=db.theme_questions.theme
    )
    
    theme_names = {
        'childhood': 'Childhood',
        'family': 'Family', 
        'career': 'Career',
        'travel': 'Travel & Adventures',
        'milestones': 'Milestones',
        'everyday': 'Everyday Life',
        'challenges': 'Challenges & Growth',
        'relationships': 'Relationships',
        'general': 'General Memory'
    }
    
    result = []
    for theme in themes:
        result.append({
            'key': theme.theme,
            'name': theme_names.get(theme.theme, theme.theme.title())
        })
    
    return dict(themes=result)

# Family management endpoints
@action('join')
@action.uses('join.html')
def join_family():
    """Join an existing family timeline"""
    return dict()

@action('join_family', method='POST')
@action.uses(db)
def join_family_endpoint():
    """Join family with access code"""
    access_code = request.forms.get('access_code', '').upper()
    
    family = get_family_by_code(access_code)
    if not family:
        return dict(error="Invalid access code")
    
    redirect(URL('index', vars={'family': access_code}))

@action('create')
@action.uses('create.html')
def create_timeline():
    """Create new family timeline page"""
    return dict()