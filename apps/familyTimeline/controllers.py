"""
Family Tree Controllers - Complete with Authentication Support

REPLACE YOUR ENTIRE apps/familyTimeline/controllers.py FILE WITH THIS CODE
"""
import os
import json
import base64
from datetime import datetime
from py4web import action, request, abort, redirect, URL, HTTP, response
from py4web.utils.form import Form, FormStyleBulma

# Import from common and models
from .common import db, session, T, cache, auth, flash, authenticated, unauthenticated
from .models import (
    create_family_tree_with_owner, get_user_family_trees, check_user_permission,
    get_family_tree_data, get_person_stories, save_person_story,
    add_person, add_relationship, calculate_tree_positions,
    update_generation_levels, get_user_display_name
)

# ==========================================
# MAIN PAGES
# ==========================================

# Landing page - redirect based on auth status
@action('index')
@action.uses('index.html', db, session, auth)
def index():
    """Main landing page - redirect to dashboard if logged in"""
    if auth.user:
        # User is logged in, redirect to dashboard
        redirect(URL('dashboard'))
    else:
        # Show public landing page
        return dict(authenticated=False)

# User Dashboard (after login)
@action('dashboard')
@action.uses('dashboard.html', db, session, auth.user)
def dashboard():
    """User dashboard showing all family trees they have access to"""
    user_id = auth.user_id
    
    # Get user's family trees
    family_trees = get_user_family_trees(user_id)
    
    return dict(
        user=auth.user,
        family_trees=family_trees
    )

# Family tree view (auth required)
@action('tree/<family_id>')
@action.uses('tree.html', db, session, auth.user)
def view_tree(family_id):
    """View a specific family tree (requires authentication)"""
    try:
        family_id_int = int(family_id)
    except ValueError:
        abort(404)
    
    # Check if user has access to this family tree
    if not check_user_permission(auth.user_id, family_id_int, 'view'):
        abort(403, "You don't have permission to access this family tree")
    
    family = db.families[family_id_int]
    if not family:
        abort(404)
    
    return dict(
        family=family,
        family_code=family.id  # Use ID instead of access code
    )

# Create family tree page
@action('create-tree')
@action.uses('create-tree.html', db, session, auth.user)
def create_tree_page():
    """Create new family tree page (requires authentication)"""
    return dict(user=auth.user)

# ==========================================
# AUTHENTICATION PAGES
# ==========================================

@action('login')
@action.uses('auth.html', db, session)
def login():
    """Custom login page"""
    if auth.user:
        redirect(URL('dashboard'))
    
    # Disable auto-generated links
    form = auth.form('login', 
                     show_register_link=False,  # Disable "Sign Up" link
                     show_forgot_password_link=False)  # Disable "Lost Password" link
    
    return dict(
        form=form,
        title="Sign In"
    )

@action('register')
@action.uses('auth.html', db, session)
def register():
    """Custom register page"""

    
    form = auth.form('register',
                     show_login_link=False)  # Disable "Sign In" link
    
    if form.accepted:
        # Registration successful, redirect to dashboard
        redirect(URL('dashboard'))
    
    return dict(
        form=form,
        title="Create Account"
    )

@action('logout')
@action.uses(db, session, auth)
def logout():
    """Logout and redirect"""
    auth.session.clear()
    redirect(URL('index'))

@action('profile')
@action.uses('auth.html', db, session, auth.user)
def profile():
    """User profile management"""
    form = auth.form('profile')
    
    return dict(
        form=form,
        title="Profile Settings"
    )

@action('change-password')
@action.uses('auth.html', db, session, auth.user)
def change_password():
    """Change password page"""
    form = auth.form('change_password')
    
    return dict(
        form=form,
        title="Change Password"
    )

@action('forgot-password')
@action.uses('auth.html', db, session)
def forgot_password():
    """Password reset request page"""
    form = auth.form('request_reset_password')
    
    return dict(
        form=form,
        title="Reset Password"
    )

# ==========================================
# API ENDPOINTS
# ==========================================

# Create family tree API
@action('api/create-family', method='POST')
@action.uses(db, session, auth.user)
def create_family_endpoint():
    """Create a new family tree (requires authentication)"""
    data = request.json
    
    if not data or 'family_name' not in data:
        raise HTTP(400, "Missing required fields")
    
    user_id = auth.user_id
    
    # Create family tree with authenticated user as owner
    family_id = create_family_tree_with_owner(data['family_name'], user_id)
    
    return dict(
        success=True,
        family_id=family_id,
        redirect_url=URL('tree', family_id)
    )

# Get tree data API
@action('api/tree/<family_id>')
@action.uses(db, session, auth.user)
def get_tree_data(family_id):
    """Get complete tree data for a family (requires authentication)"""
    try:
        family_id_int = int(family_id)
    except ValueError:
        raise HTTP(400, "Invalid family ID")
    
    # Check if user has access to this family tree
    if not check_user_permission(auth.user_id, family_id_int, 'view'):
        raise HTTP(403, "You don't have permission to access this family tree")
    
    family = db.families[family_id_int]
    if not family:
        raise HTTP(404, "Family not found")
    
    tree_data = get_family_tree_data(family_id_int)
    
    # Get tree settings
    tree_settings = db(db.tree_settings.family_id == family_id_int).select().first()
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
@action.uses(db, session, auth.user)
def add_person_endpoint():
    """Add a new person to the family tree (requires authentication)"""
    data = request.json
    
    # Validate required fields
    if not data or 'family_id' not in data or 'first_name' not in data:
        raise HTTP(400, "Missing required fields")
    
    family_id = data['family_id']
    
    # Check if user has permission to add people to this family tree
    if not check_user_permission(auth.user_id, family_id, 'edit'):
        raise HTTP(403, "You don't have permission to add people to this family tree")
    
    family = db.families[family_id]
    if not family:
        raise HTTP(404, "Family not found")
    
    # Create person with user tracking
    person_data = {
        'first_name': data['first_name'],
        'last_name': data.get('last_name', ''),
        'maiden_name': data.get('maiden_name', ''),
        'nickname': data.get('nickname', ''),
        'birth_date': data.get('birth_date'),
        'death_date': data.get('death_date'),
        'birth_place': data.get('birth_place', ''),
        'gender': data.get('gender', ''),
        'is_living': data.get('is_living', True),
        'bio_summary': data.get('bio_summary', ''),
        'generation_level': data.get('generation_level', 0),
        'node_color': data.get('node_color', 'green'),
        'node_shape': data.get('node_shape', 'circle')
    }
    
    # Handle photo if present
    if 'photo_data' in data and data['photo_data']:
        try:
            photo_data_str = data['photo_data']
            if ',' in photo_data_str:
                photo_data_str = photo_data_str.split(',')[1]
            person_data['profile_photo'] = base64.b64decode(photo_data_str)
            person_data['profile_photo_filename'] = data.get('photo_filename', f"profile_{data['first_name']}.jpg")
        except Exception as e:
            print(f"Error processing photo: {e}")
    
    person_id = add_person(
        family_id, 
        created_by_user_id=auth.user_id,
        **person_data
    )
    
    return dict(
        success=True,
        person_id=person_id,
        message="Person added successfully"
    )

# Get single person API
@action('api/person/<person_id>')
@action.uses(db, session, auth.user)
def get_person_endpoint(person_id):
    """Get details for a specific person"""
    try:
        person_id_int = int(person_id)
    except ValueError:
        raise HTTP(400, "Invalid person ID")
    
    person = db.people[person_id_int]
    if not person:
        raise HTTP(404, "Person not found")
    
    # Check if user has access to this person's family tree
    if not check_user_permission(auth.user_id, person.family_id, 'view'):
        raise HTTP(403, "You don't have permission to view this person")
    
    person_data = {
        'id': person.id,
        'first_name': person.first_name,
        'last_name': person.last_name or '',
        'maiden_name': person.maiden_name or '',
        'nickname': person.nickname or '',
        'birth_date': person.birth_date.isoformat() if person.birth_date else None,
        'death_date': person.death_date.isoformat() if person.death_date else None,
        'birth_place': person.birth_place or '',
        'is_living': person.is_living,
        'gender': person.gender or '',
        'bio_summary': person.bio_summary or '',
        'has_photo': bool(person.profile_photo),
        'generation_level': person.generation_level,
        'node_color': person.node_color or 'green',
        'node_shape': person.node_shape or 'circle'
    }
    
    return dict(person=person_data)

# Update person API
@action('api/person/<person_id>', method='PUT')
@action.uses(db, session, auth.user)
def update_person_endpoint(person_id):
    """Update an existing person (requires authentication)"""
    try:
        person_id_int = int(person_id)
    except ValueError:
        raise HTTP(400, "Invalid person ID")
    
    data = request.json
    if not data:
        raise HTTP(400, "No data provided")
    
    person = db.people[person_id_int]
    if not person:
        raise HTTP(404, "Person not found")
    
    # Check if user has permission to edit this person
    # For now, allow if user can edit the family tree
    # Later we can add more granular permissions
    if not check_user_permission(auth.user_id, person.family_id, 'edit'):
        raise HTTP(403, "You don't have permission to edit this person")
    
    # Update person data
    update_data = {
        'first_name': data.get('first_name', person.first_name),
        'last_name': data.get('last_name', ''),
        'maiden_name': data.get('maiden_name', ''),
        'nickname': data.get('nickname', ''),
        'birth_date': data.get('birth_date'),
        'death_date': data.get('death_date'),
        'birth_place': data.get('birth_place', ''),
        'gender': data.get('gender', ''),
        'is_living': data.get('is_living', True),
        'bio_summary': data.get('bio_summary', ''),
        'node_color': data.get('node_color', 'green'),
        'node_shape': data.get('node_shape', 'circle'),
        'last_edited_by_user_id': auth.user_id  # Track who last edited
    }
    
    # Handle photo if present
    if 'photo_data' in data and data['photo_data']:
        try:
            photo_data_str = data['photo_data']
            if ',' in photo_data_str:
                photo_data_str = photo_data_str.split(',')[1]
            update_data['profile_photo'] = base64.b64decode(photo_data_str)
            update_data['profile_photo_filename'] = data.get('photo_filename', f"profile_{data['first_name']}.jpg")
        except Exception as e:
            print(f"Error processing photo: {e}")
    
    # Update the person
    db(db.people.id == person_id_int).update(**update_data)
    db.commit()
    
    return dict(
        success=True,
        message="Person updated successfully"
    )

# Delete person API
@action('api/person/<person_id>', method='DELETE')
@action.uses(db, session, auth.user)
def delete_person_endpoint(person_id):
    """Delete a person and all associated data"""
    try:
        person_id_int = int(person_id)
    except ValueError:
        raise HTTP(400, "Invalid person ID")
    
    person = db.people[person_id_int]
    if not person:
        raise HTTP(404, "Person not found")
    
    # Check if user has permission to delete from this family tree
    if not check_user_permission(auth.user_id, person.family_id, 'manage'):
        raise HTTP(403, "You don't have permission to delete people from this family tree")
    
    try:
        # Get counts for confirmation response
        story_count = db(db.stories.person_id == person_id_int).count()
        relationship_count = db(
            (db.relationships.person1_id == person_id_int) | 
            (db.relationships.person2_id == person_id_int)
        ).count()
        
        # Delete all stories for this person
        db(db.stories.person_id == person_id_int).delete()
        
        # Delete all relationships involving this person
        db(
            (db.relationships.person1_id == person_id_int) | 
            (db.relationships.person2_id == person_id_int)
        ).delete()
        
        # Delete the person
        db(db.people.id == person_id_int).delete()
        
        db.commit()
        
        return dict(
            success=True,
            message=f"Person deleted successfully",
            deleted_stories=story_count,
            deleted_relationships=relationship_count
        )
        
    except Exception as e:
        db.rollback()
        print(f"Error deleting person: {e}")
        raise HTTP(500, "Error deleting person")

# Get person deletion preview API
@action('api/person/<person_id>/delete-preview')
@action.uses(db, session, auth.user)
def get_delete_preview(person_id):
    """Get information about what will be deleted with this person"""
    try:
        person_id_int = int(person_id)
    except ValueError:
        raise HTTP(400, "Invalid person ID")
    
    person = db.people[person_id_int]
    if not person:
        raise HTTP(404, "Person not found")
    
    # Check if user has permission
    if not check_user_permission(auth.user_id, person.family_id, 'view'):
        raise HTTP(403, "You don't have permission to view this person")
    
    # Get stories
    stories = db(db.stories.person_id == person_id_int).select()
    story_data = [{'id': s.id, 'title': s.title, 'theme': s.theme} for s in stories]
    
    # Get relationships
    relationships = db(
        (db.relationships.person1_id == person_id_int) | 
        (db.relationships.person2_id == person_id_int)
    ).select()
    
    relationship_data = []
    for rel in relationships:
        other_person_id = rel.person2_id if rel.person1_id == person_id_int else rel.person1_id
        other_person = db.people[other_person_id]
        if other_person:
            relationship_data.append({
                'id': rel.id,
                'relationship_type': rel.relationship_type,
                'other_person': f"{other_person.first_name} {other_person.last_name or ''}".strip()
            })
    
    return dict(
        person_name=f"{person.first_name} {person.last_name or ''}".strip(),
        stories=story_data,
        relationships=relationship_data,
        story_count=len(story_data),
        relationship_count=len(relationship_data)
    )

# Add relationship API
@action('api/relationship', method='POST')
@action.uses(db, session, auth.user)
def add_relationship_endpoint():
    """Create a relationship between two people"""
    data = request.json
    
    # Validate required fields
    if not data or 'family_id' not in data or 'person1_id' not in data or 'person2_id' not in data or 'relationship_type' not in data:
        raise HTTP(400, "Missing required fields")
    
    family_id = data['family_id']
    
    # Check if user has permission to manage relationships in this family tree
    if not check_user_permission(auth.user_id, family_id, 'edit'):
        raise HTTP(403, "You don't have permission to manage relationships in this family tree")
    
    family = db.families[family_id]
    if not family:
        raise HTTP(404, "Family not found")
    
    # Verify both people exist and belong to family
    person1 = db((db.people.id == data['person1_id']) & (db.people.family_id == family_id)).select().first()
    person2 = db((db.people.id == data['person2_id']) & (db.people.family_id == family_id)).select().first()
    
    if not person1 or not person2:
        raise HTTP(404, "One or both people not found in this family")
    
    # Create the relationship
    relationship_id = add_relationship(
        family_id,
        data['person1_id'],
        data['person2_id'],
        data['relationship_type'],
        created_by_user_id=auth.user_id,
        marriage_date=data.get('marriage_date'),
        divorce_date=data.get('divorce_date')
    )
    
    # Update generation levels if needed
    update_generation_levels(family_id)
    
    return dict(
        success=True,
        relationship_id=relationship_id,
        message="Relationship created successfully"
    )

# Get person's stories API
@action('api/person/<person_id>/stories')
@action.uses(db, session, auth.user)
def get_person_stories_endpoint(person_id):
    """Get all stories for a specific person"""
    try:
        person_id_int = int(person_id)
    except ValueError:
        raise HTTP(400, "Invalid person ID")
    
    person = db.people[person_id_int]
    if not person:
        raise HTTP(404, "Person not found")
    
    # Check if user has access to this person's family tree
    if not check_user_permission(auth.user_id, person.family_id, 'view'):
        raise HTTP(403, "You don't have permission to view stories for this person")
    
    stories = get_person_stories(person_id_int)
    return dict(stories=stories)

# Add story API
@action('api/story', method='POST')
@action.uses(db, session, auth.user)
def add_story_endpoint():
    """Add a new story for a person (requires authentication)"""
    data = request.json
    
    # Validate required fields
    required_fields = ['family_id', 'person_id', 'title', 'theme', 'story_text']
    for field in required_fields:
        if field not in data:
            raise HTTP(400, f"Missing required field: {field}")
    
    family_id = data['family_id']
    
    # Check if user has permission to add stories to this family tree
    if not check_user_permission(auth.user_id, family_id, 'edit'):
        raise HTTP(403, "You don't have permission to add stories to this family tree")
    
    # Get family
    family = db.families[family_id]
    if not family:
        raise HTTP(404, "Family not found")
    
    # Verify person exists and belongs to family
    person = db(
        (db.people.id == data['person_id']) & 
        (db.people.family_id == family_id)
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
    
    # Get author name from authenticated user
    author_name = get_user_display_name(auth.user_id)
    
    # Save story
    story_data = {
        'title': data['title'],
        'author_name': author_name,  # Use authenticated user's name
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
        family_id,
        data['person_id'],
        author_user_id=auth.user_id,
        **story_data
    )
    
    return dict(
        success=True,
        story_id=story_id,
        message="Story saved successfully"
    )

# Get themes API  
@action('api/themes')
@action.uses(db, session, auth.user)
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
@action.uses(db, session, auth.user)
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
@action.uses(db, session, auth.user)
def get_story_photo(story_id):
    """Get photo for a story"""
    try:
        story_id_int = int(story_id)
    except ValueError:
        raise HTTP(400, "Invalid story ID")
    
    story = db.stories[story_id_int]
    if not story or not story.photo_data:
        raise HTTP(404, "Photo not found")
    
    # Check if user has access to this story's family tree
    if not check_user_permission(auth.user_id, story.family_id, 'view'):
        raise HTTP(403, "You don't have permission to view this photo")
    
    # Determine content type
    content_type = 'image/jpeg'
    if story.photo_filename:
        if story.photo_filename.lower().endswith('.png'):
            content_type = 'image/png'
        elif story.photo_filename.lower().endswith('.gif'):
            content_type = 'image/gif'
        elif story.photo_filename.lower().endswith('.webp'):
            content_type = 'image/webp'
    
    response.headers['Content-Type'] = content_type
    response.headers['Cache-Control'] = 'public, max-age=3600'
    return story.photo_data

# Get person photo API
@action('api/person-photo/<person_id>')
@action.uses(db, session, auth.user)
def get_person_photo(person_id):
    """Get profile photo for a person"""
    try:
        person_id_int = int(person_id)
    except ValueError:
        raise HTTP(400, "Invalid person ID")
    
    person = db.people[person_id_int]
    if not person or not person.profile_photo:
        raise HTTP(404, "Photo not found")
    
    # Check if user has access to this person's family tree
    if not check_user_permission(auth.user_id, person.family_id, 'view'):
        raise HTTP(403, "You don't have permission to view this photo")
    
    # Determine content type
    content_type = 'image/jpeg'
    if person.profile_photo_filename:
        if person.profile_photo_filename.lower().endswith('.png'):
            content_type = 'image/png'
        elif person.profile_photo_filename.lower().endswith('.gif'):
            content_type = 'image/gif'
        elif person.profile_photo_filename.lower().endswith('.webp'):
            content_type = 'image/webp'
    
    response.headers['Content-Type'] = content_type
    response.headers['Cache-Control'] = 'public, max-age=3600'
    return person.profile_photo

# Update tree settings API
@action('api/tree/<family_id>/settings', method='PUT')
@action.uses(db, session, auth.user)
def update_tree_settings(family_id):
    """Update tree display settings"""
    try:
        family_id_int = int(family_id)
    except ValueError:
        raise HTTP(400, "Invalid family ID")
    
    # Check if user has permission to manage this family tree
    if not check_user_permission(auth.user_id, family_id_int, 'manage'):
        raise HTTP(403, "You don't have permission to modify settings for this family tree")
    
    family = db.families[family_id_int]
    if not family:
        raise HTTP(404, "Family not found")
    
    data = request.json
    if not data:
        raise HTTP(400, "No data provided")
    
    # Get or create tree settings
    settings = db(db.tree_settings.family_id == family_id_int).select().first()
    
    update_data = {
        'tree_style': data.get('tree_style', 'classic'),
        'color_scheme': data.get('color_scheme', 'earth'),
        'show_photos': data.get('show_photos', True),
        'show_dates': data.get('show_dates', True),
        'show_places': data.get('show_places', False),
        'root_person_id': data.get('root_person_id'),
        'allow_dual_roots': data.get('allow_dual_roots', False),
        'primary_root_person_id': data.get('primary_root_person_id'),
        'secondary_root_person_id': data.get('secondary_root_person_id'),
        'background_settings': data.get('background_settings'),
        'connection_line_settings': data.get('connection_line_settings')
    }
    
    if settings:
        db(db.tree_settings.family_id == family_id_int).update(**update_data)
    else:
        update_data['family_id'] = family_id_int
        db.tree_settings.insert(**update_data)
    
    db.commit()
    
    return dict(
        success=True,
        message="Tree settings updated successfully"
    )

# ==========================================
# FAMILY MANAGEMENT APIs (Future Phase 2)
# ==========================================

# Get family members API
@action('api/family/<family_id>/members')
@action.uses(db, session, auth.user)
def get_family_members(family_id):
    """Get all members of a family tree"""
    try:
        family_id_int = int(family_id)
    except ValueError:
        raise HTTP(400, "Invalid family ID")
    
    # Check if user has access to this family tree
    if not check_user_permission(auth.user_id, family_id_int, 'view'):
        raise HTTP(403, "You don't have permission to view this family tree")
    
    # Get family members with user details
    query = (
        (db.family_members.family_id == family_id_int) &
        (db.family_members.is_active == True) &
        (db.family_members.user_id == db.auth_user.id)
    )
    
    rows = db(query).select(
        db.family_members.ALL,
        db.auth_user.first_name,
        db.auth_user.last_name,
        db.auth_user.email,
        orderby=db.family_members.role | db.auth_user.first_name
    )
    
    members = []
    for row in rows:
        member = row.family_members
        user = row.auth_user
        
        members.append({
            'id': member.id,
            'user_id': member.user_id,
            'role': member.role,
            'user_name': f"{user.first_name} {user.last_name}".strip() or user.email,
            'email': user.email,
            'joined_at': member.joined_at.isoformat(),
            'invited_by': get_user_display_name(member.invited_by) if member.invited_by else None
        })
    
    return dict(members=members)

# Invite family member API (Future Phase 3)
@action('api/family/<family_id>/invite', method='POST')
@action.uses(db, session, auth.user)
def invite_family_member(family_id):
    """Invite someone to join a family tree"""
    try:
        family_id_int = int(family_id)
    except ValueError:
        raise HTTP(400, "Invalid family ID")
    
    # Check if user has permission to invite others
    if not check_user_permission(auth.user_id, family_id_int, 'invite'):
        raise HTTP(403, "You don't have permission to invite others to this family tree")
    
    data = request.json
    if not data or 'email' not in data or 'role' not in data:
        raise HTTP(400, "Missing required fields: email and role")
    
    # TODO: Implement invitation system in Phase 3
    # For now, return placeholder
    return dict(
        success=True,
        message="Invitation system coming in Phase 3",
        invitation_token="placeholder"
    )

# ==========================================
# LEGACY ENDPOINTS (For backward compatibility)
# ==========================================

# Keep some legacy endpoints for gradual migration
@action('create')
@action.uses(db, session, auth)
def legacy_create():
    """Legacy create page - redirect to new flow"""
    if auth.user:
        redirect(URL('create-tree'))
    else:
        redirect(URL('register'))

@action('join')
@action.uses(db, session, auth)
def legacy_join():
    """Legacy join page - redirect to new flow"""
    if auth.user:
        redirect(URL('dashboard'))
    else:
        redirect(URL('login'))

# ==========================================
# UTILITY ENDPOINTS
# ==========================================

# Health check endpoint (no auth required)
@action('api/health')
def health_check():
    """Simple health check endpoint"""
    return dict(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        authenticated=bool(auth.user) if hasattr(auth, 'user') else False,
        app_version="2.0.0-auth"
    )

# Error handler
@action('error')
@action.uses('index.html', db, session, auth)
def error():
    """Error page"""
    return dict(
        error_message="An error occurred",
        authenticated=bool(auth.user)
    )

# API status endpoint
@action('api/status')
@action.uses(db, session, auth.user)
def api_status():
    """API status for authenticated users"""
    user_family_count = len(get_user_family_trees(auth.user_id))
    
    return dict(
        status="ok",
        user_id=auth.user_id,
        user_name=get_user_display_name(auth.user_id),
        family_tree_count=user_family_count,
        permissions_available=["view", "edit", "manage", "invite", "admin"]
    )

# ==========================================
# DEVELOPMENT HELPER ENDPOINTS
# ==========================================

# Debug endpoint for development
@action('api/debug/user-info')
@action.uses(db, session, auth.user)
def debug_user_info():
    """Debug endpoint to see user info (development only)"""
    user_trees = get_user_family_trees(auth.user_id)
    
    debug_info = {
        'user_id': auth.user_id,
        'user_email': auth.user.email,
        'user_name': get_user_display_name(auth.user_id),
        'family_trees': user_trees,
        'session_info': dict(session) if session else None,
        'auth_info': {
            'is_logged_in': bool(auth.user),
            'user_data': dict(auth.user) if auth.user else None
        }
    }
    
    return debug_info

"""
==========================================
API ENDPOINTS SUMMARY
==========================================

AUTHENTICATION:
- GET /login - Login page
- GET /register - Registration page  
- GET /logout - Logout
- GET /profile - User profile
- GET /change-password - Change password
- GET /forgot-password - Password reset

MAIN PAGES:
- GET / - Landing page or redirect to dashboard
- GET /dashboard - User dashboard
- GET /tree/<id> - View family tree
- GET /create-tree - Create new tree page

FAMILY TREE MANAGEMENT:
- POST /api/create-family - Create new family
- GET /api/tree/<id> - Get tree data
- PUT /api/tree/<id>/settings - Update tree settings
- GET /api/family/<id>/members - Get family members

PERSON MANAGEMENT:
- POST /api/person - Add person
- GET /api/person/<id> - Get person details
- PUT /api/person/<id> - Update person
- DELETE /api/person/<id> - Delete person
- GET /api/person/<id>/delete-preview - Preview deletion
- GET /api/person-photo/<id> - Get person photo

RELATIONSHIP MANAGEMENT:
- POST /api/relationship - Create relationship

STORY MANAGEMENT:
- GET /api/person/<id>/stories - Get person's stories
- POST /api/story - Add story
- GET /api/story-photo/<id> - Get story photo

THEME/QUESTION MANAGEMENT:
- GET /api/themes - Get all themes
- GET /api/themes/<theme>/questions - Get theme questions

FUTURE ENDPOINTS (Phase 2-3):
- POST /api/family/<id>/invite - Invite family member
- GET /api/invitations - Get pending invitations
- POST /api/invitations/<token>/accept - Accept invitation

UTILITY:
- GET /api/health - Health check
- GET /api/status - API status (auth required)
- GET /api/debug/user-info - Debug info (development)

All endpoints include proper authentication checks and permission validation.
"""