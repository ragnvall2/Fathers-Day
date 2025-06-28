"""
Family Tree Controllers - Complete with Authentication Support
"""
import os
import json
import base64
from datetime import datetime
from types import SimpleNamespace
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

@action('index')
@action.uses('index.html', db, session, auth)
def index():
    """Main landing page - redirect to dashboard if logged in"""
    if auth.user:
        redirect(URL('dashboard'))
    else:
        return dict(authenticated=False)

@action('dashboard')
@action.uses('dashboard.html', db, session, auth.user, flash)
def dashboard():
    """User dashboard showing all family trees they have access to"""
    user_id = auth.user_id
    user_record = db.auth_user[user_id]
    if not user_record:
        redirect(URL('login'))
    
    family_trees = get_user_family_trees(user_id)
    
    return dict(
        user=user_record,
        family_trees=family_trees
    )

@action('createTree')
@action.uses('createTree.html', db, session, auth.user, flash)
def create_tree_page():
    """Create new family tree page (requires authentication)"""
    try:
        user_record = db.auth_user[auth.user_id]
        return dict(user=user_record)
    except Exception as e:
        print(f"Error in createTree: {e}")
        redirect(URL('dashboard'))

@action('tree/<family_id:int>')
@action.uses('tree.html', db, session, auth.user)
def view_tree(family_id):
    """View a specific family tree (requires authentication)"""
    print(f"DEBUG: Accessing tree with family_id: {family_id}")
    
    # Check if user has access to this family tree
    if not check_user_permission(auth.user_id, family_id, 'view'):
        print(f"DEBUG: Permission denied for user {auth.user_id} on family {family_id}")
        abort(403, "You don't have permission to access this family tree")
    
    family = db.families[family_id]
    if not family:
        print(f"DEBUG: Family {family_id} not found")
        abort(404, "Family tree not found")
    
    print(f"DEBUG: Found family: {family.family_name}")
    
    # Get additional family info
    family_member_count = db(db.family_members.family_id == family_id).count()
    user_role = db(
        (db.family_members.family_id == family_id) & 
        (db.family_members.user_id == auth.user_id)
    ).select().first()
    
    # Get the actual user record from the database
    current_user = db.auth_user[auth.user_id]
    
    return dict(
        family=family,
        family_code=family.id,
        family_member_count=family_member_count,
        user_role=user_role.role if user_role else 'viewer',
        auth=auth,
        user=current_user  # Pass the actual user record
    )

# ==========================================
# AUTHENTICATION PAGES
# ==========================================

@action('login')
@action.uses('auth.html', db, session, flash)
def login():
    """Custom login page"""
    if auth.user:
        redirect(URL('dashboard'))
    
    form = auth.form('login', 
                     show_register_link=False,
                     show_forgot_password_link=False)
    
    if form.accepted:
        redirect(URL('dashboard'))
    
    return dict(form=form, title="Sign In")

@action('register')
@action.uses('auth.html', db, session, flash)
def register():
    """Custom register page"""
    if auth.user:
        redirect(URL('dashboard'))
    
    try:
        form = auth.form('register', show_login_link=False)
        
        if form.accepted:
            flash.set("Registration successful! Welcome to Family Tree.", "success")
            redirect(URL('dashboard'))
            
    except Exception as e:
        print(f"Registration error: {e}")
        if auth.user:
            redirect(URL('dashboard'))
        flash.set("Registration completed. Please sign in.", "info")
        redirect(URL('login'))
    
    return dict(form=form, title="Create Account")

@action('logout')
@action.uses(db, session, flash)
def logout():
    """Logout and redirect"""
    try:
        auth.session.clear()
        flash.set("You have been logged out.", "info")
    except:
        pass
    redirect(URL('index'))

@action('profile')
@action.uses('auth.html', db, session, auth.user, flash)
def profile():
    """User profile management"""
    form = auth.form('profile')
    if form.accepted:
        flash.set("Profile updated successfully!", "success")
        redirect(URL('profile'))
    return dict(form=form, title="Profile Settings")

@action('changePassword')
@action.uses('auth.html', db, session, auth.user, flash)
def change_password():
    """Change password page"""
    form = auth.form('change_password')
    if form.accepted:
        flash.set("Password changed successfully!", "success")
        redirect(URL('dashboard'))
    return dict(form=form, title="Change Password")

@action('forgotPassword')
@action.uses('auth.html', db, session, flash)
def forgot_password():
    """Password reset request page"""
    form = auth.form('request_reset_password')
    if form.accepted:
        flash.set("Password reset instructions sent to your email.", "info")
        redirect(URL('login'))
    return dict(form=form, title="Reset Password")

# ==========================================
# API ENDPOINTS
# ==========================================

@action('api/createFamily', method='POST')
@action.uses(db, session, auth.user)
def create_family_endpoint():
    """Create a new family tree (requires authentication)"""
    try:
        data = request.json
        
        if not data or 'family_name' not in data:
            return dict(success=False, message="Missing family name")
        
        user_id = auth.user_id
        family_id = create_family_tree_with_owner(data['family_name'], user_id)
        
        print(f"DEBUG: Created family with ID: {family_id}")
        print(f"DEBUG: Redirect URL will be: {URL('tree', family_id)}")
        
        return dict(
            success=True,
            family_id=family_id,
            redirect_url=URL('tree', family_id),
            message="Family tree created successfully!"
        )
        
    except Exception as e:
        print(f"Error creating family: {e}")
        import traceback
        traceback.print_exc()
        return dict(success=False, message=str(e))

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

@action('api/person', method='POST')
@action.uses(db, session, auth.user)
def add_person_endpoint():
    """Add a new person to the family tree (requires authentication)"""
    try:
        data = request.json
        print(f"DEBUG: Received person data: {data}")
        
        # Validate required fields
        if not data:
            return dict(success=False, message="No data provided")
        
        if 'family_id' not in data:
            return dict(success=False, message="Missing family_id")
            
        if 'first_name' not in data:
            return dict(success=False, message="Missing first_name")
        
        family_id = data['family_id']
        
        # Check if user has permission to add people to this family tree
        if not check_user_permission(auth.user_id, family_id, 'edit'):
            return dict(success=False, message="You don't have permission to add people to this family tree")
        
        family = db.families[family_id]
        if not family:
            return dict(success=False, message="Family not found")
        
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
            'node_shape': data.get('node_shape', 'circle'),
            'grid_row': data.get('grid_row'),       
            'grid_col': data.get('grid_col')
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
        
        print(f"DEBUG: Creating person with data: {person_data}")
        
        person_id = add_person(
            family_id, 
            created_by_user_id=auth.user_id,
            **person_data
        )
        
        print(f"DEBUG: Created person with ID: {person_id}")
        
        return dict(
            success=True,
            person_id=person_id,
            message="Person added successfully"
        )
        
    except Exception as e:
        print(f"ERROR in add_person_endpoint: {e}")
        import traceback
        traceback.print_exc()
        return dict(
            success=False,
            message=str(e)
        )

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
        'last_edited_by_user_id': auth.user_id,
        'grid_row': data.get('grid_row', person.grid_row),
        'grid_col': data.get('grid_col', person.grid_col),
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
        'author_name': author_name,
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

# ==========================================
# DEBUG ENDPOINTS
# ==========================================

@action('debug/test-tree')
@action.uses(db, session, auth.user)
def debug_tree_route():
    """Debug tree routing"""
    
    # Get user's families
    families = db(
        (db.family_members.user_id == auth.user_id) &
        (db.family_members.family_id == db.families.id)
    ).select(db.families.ALL, db.family_members.role)
    
    debug_html = "<h1>Tree Route Debug</h1>"
    debug_html += f"<p>User ID: {auth.user_id}</p>"
    debug_html += "<h2>Your Families:</h2><ul>"
    
    for row in families:
        family = row.families
        role = row.family_members.role
        tree_url = URL('tree', family.id)
        debug_html += f"<li><a href='{tree_url}'>{family.family_name}</a> (ID: {family.id}, Role: {role})</li>"
    
    debug_html += "</ul>"
    debug_html += f"<p><a href='{URL('dashboard')}'>Back to Dashboard</a></p>"
    
    return debug_html

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

# ==========================================
# UTILITY ENDPOINTS
# ==========================================

@action('api/health')
def health_check():
    """Simple health check endpoint"""
    return dict(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        authenticated=bool(auth.user) if hasattr(auth, 'user') else False,
        app_version="2.0.0-auth"
    )

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


# Clear Database

@action('api/clear_database', method=['GET', 'POST'])
@action.uses(db, session)   # or drop auth entirely if it’s just you
def clear_database():
    # delete everything except the auth tables
    for t in db.tables:
        if t not in ('auth_user','auth_group','auth_membership'):
            db(db[t]).delete()
    db.commit()
    return dict(success=True, message="✅ All non-auth tables wiped.")