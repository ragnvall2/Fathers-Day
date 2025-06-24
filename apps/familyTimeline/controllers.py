"""
Family Tree Controllers - Clean Version
"""
import os
import json
import base64
from py4web import action, request, abort, redirect, URL, HTTP, response
from py4web.utils.form import Form, FormStyleBulma

# Import from common and models
from .common import db, session, T, cache, auth, flash
from .models import (
    create_family_tree, get_family_by_code, 
    get_family_tree_data, get_person_stories, save_person_story,
    add_person, add_relationship, calculate_tree_positions,
    update_generation_levels
)

# Main tree page
@action('index')
@action.uses('tree.html', db)
def index():
    """Main family tree page"""
    family_code = request.query.get('family', '')
    family = None
    
    if family_code:
        family = get_family_by_code(family_code)
        if not family:
            redirect(URL('index'))
    
    return dict(
        family=family,
        family_code=family_code
    )

# Create family tree page
@action('create')
@action.uses('create.html')
def create_timeline():
    """Create new family tree page"""
    return dict()

# Create family tree API
@action('create_family', method='POST')
@action.uses(db)
def create_family_endpoint():
    """Create a new family tree"""
    data = request.json
    
    if not data or 'family_name' not in data or 'created_by' not in data:
        raise HTTP(400, "Missing required fields")
    
    family_id, access_code = create_family_tree(
        data['family_name'], 
        data['created_by']
    )
    
    return dict(
        success=True,
        family_id=family_id,
        access_code=access_code,
        redirect_url=URL('index', vars={'family': access_code})
    )

# Get tree data API
@action('api/tree/<family_code>')
@action.uses(db)
def get_tree_data(family_code):
    """Get complete tree data for a family"""
    family = get_family_by_code(family_code)
    if not family:
        raise HTTP(404, "Family not found")
    
    tree_data = get_family_tree_data(family.id)
    
    # Get tree settings
    tree_settings = db(db.tree_settings.family_id == family.id).select().first()
    settings_data = {}
    if tree_settings:
        settings_data = {
            'tree_style': tree_settings.tree_style,
            'color_scheme': tree_settings.color_scheme,
            'show_photos': tree_settings.show_photos,
            'show_dates': tree_settings.show_dates,
            'show_places': tree_settings.show_places,
            'root_person_id': tree_settings.root_person_id
        }
    
    return dict(
        people=tree_data['people'],
        relationships=tree_data['relationships'],
        settings=settings_data
    )

# Add person API
@action('api/person', method='POST')
@action.uses(db)
def add_person_endpoint():
    """Add a new person to the family tree"""
    data = request.json
    
    # Validate required fields
    if not data or 'family_code' not in data or 'first_name' not in data:
        raise HTTP(400, "Missing required fields")
    
    family = get_family_by_code(data['family_code'])
    if not family:
        raise HTTP(404, "Family not found")
    
    # Create person
    person_data = {
        'first_name': data['first_name'],
        'last_name': data.get('last_name', ''),
        'birth_date': data.get('birth_date'),
        'gender': data.get('gender', ''),
        'is_living': data.get('is_living', True),
        'generation_level': data.get('generation_level', 0)
    }
    
    person_id = add_person(family.id, **person_data)
    
    return dict(
        success=True,
        person_id=person_id,
        message="Person added successfully"
    )

# Add relationship API
@action('api/relationship', method='POST')
@action.uses(db)
def add_relationship_endpoint():
    """Create a relationship between two people"""
    data = request.json
    
    # Validate required fields
    if not data or 'family_code' not in data or 'person1_id' not in data or 'person2_id' not in data or 'relationship_type' not in data:
        raise HTTP(400, "Missing required fields")
    
    family = get_family_by_code(data['family_code'])
    if not family:
        raise HTTP(404, "Family not found")
    
    # Verify both people exist and belong to family
    person1 = db((db.people.id == data['person1_id']) & (db.people.family_id == family.id)).select().first()
    person2 = db((db.people.id == data['person2_id']) & (db.people.family_id == family.id)).select().first()
    
    if not person1 or not person2:
        raise HTTP(404, "One or both people not found in this family")
    
    # Create the relationship
    relationship_id = add_relationship(
        family.id,
        data['person1_id'],
        data['person2_id'],
        data['relationship_type'],
        marriage_date=data.get('marriage_date'),
        divorce_date=data.get('divorce_date')
    )
    
    # Update generation levels if needed
    update_generation_levels(family.id)
    
    return dict(
        success=True,
        relationship_id=relationship_id,
        message="Relationship created successfully"
    )

# Get person's stories API
@action('api/person/<person_id>/stories')
@action.uses(db)
def get_person_stories_endpoint(person_id):
    """Get all stories for a specific person"""
    try:
        person_id_int = int(person_id)
    except ValueError:
        raise HTTP(400, "Invalid person ID")
    
    person = db.people[person_id_int]
    if not person:
        raise HTTP(404, "Person not found")
    
    stories = get_person_stories(person_id_int)
    return dict(stories=stories)

# Add story API
@action('api/story', method='POST')
@action.uses(db)
def add_story_endpoint():
    """Add a new story for a person"""
    data = request.json
    
    # Validate required fields
    required_fields = ['family_code', 'person_id', 'title', 'author_name', 'theme', 'story_text']
    for field in required_fields:
        if field not in data:
            raise HTTP(400, f"Missing required field: {field}")
    
    # Get family
    family = get_family_by_code(data['family_code'])
    if not family:
        raise HTTP(404, "Family not found")
    
    # Verify person exists and belongs to family
    person = db(
        (db.people.id == data['person_id']) & 
        (db.people.family_id == family.id)
    ).select().first()
    if not person:
        raise HTTP(404, "Person not found in this family")
    
    # Handle photo data if present
    photo_data = None
    photo_filename = None
    if 'photo_data' in data and data['photo_data']:
        try:
            photo_data_str = data['photo_data']
            if ',' in photo_data_str:
                photo_data_str = photo_data_str.split(',')[1]
            photo_data = base64.b64decode(photo_data_str)
            photo_filename = data.get('photo_filename', f"story_{data['title']}.jpg")
        except Exception as e:
            print(f"Error processing photo: {e}")
    
    # Save story
    story_data = {
        'title': data['title'],
        'author_name': data['author_name'],
        'theme': data['theme'],
        'time_period': data.get('time_period', ''),
        'year_occurred': data.get('year_occurred'),
        'questions_and_answers': data.get('questions_and_answers', []),
        'story_text': data['story_text'],
        'photo_data': photo_data,
        'photo_filename': photo_filename,
        'is_featured': data.get('is_featured', False)
    }
    
    story_id = save_person_story(
        family.id,
        data['person_id'],
        **story_data
    )
    
    return dict(
        success=True,
        story_id=story_id,
        message="Story saved successfully"
    )

# Get themes API  
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
        'personality': 'Personality', 
        'family_life': 'Family Life',
        'career': 'Career & Work',
        'adventures': 'Adventures & Travel',
        'relationships': 'Relationships',
        'wisdom': 'Wisdom & Lessons',
        'memories': 'Personal Memories',
        'general': 'General'
    }
    
    result = []
    for theme in themes:
        result.append({
            'key': theme.theme,
            'name': theme_names.get(theme.theme, theme.theme.title())
        })
    
    return dict(themes=result)

# Get theme questions API
@action('api/themes/<theme>/questions')
@action.uses(db)
def get_theme_questions(theme):
    """Get all questions for a specific theme"""
    questions = db(
        (db.theme_questions.theme == theme) & 
        (db.theme_questions.is_active == True)
    ).select(orderby=db.theme_questions.order_index)
    
    result = []
    for q in questions:
        result.append({
            'id': q.id,
            'text': q.question_text,
            'order': q.order_index
        })
    
    return dict(questions=result)

# Get story photo API
@action('api/story-photo/<story_id>')
@action.uses(db)
def get_story_photo(story_id):
    """Get photo for a story"""
    try:
        story_id_int = int(story_id)
    except ValueError:
        raise HTTP(400, "Invalid story ID")
    
    story = db.stories[story_id_int]
    if not story or not story.photo_data:
        raise HTTP(404, "Photo not found")
    
    # Determine content type
    content_type = 'image/jpeg'
    if story.photo_filename:
        if story.photo_filename.lower().endswith('.png'):
            content_type = 'image/png'
        elif story.photo_filename.lower().endswith('.gif'):
            content_type = 'image/gif'
    
    response.headers['Content-Type'] = content_type
    response.headers['Cache-Control'] = 'public, max-age=3600'
    return story.photo_data