"""
Family Tree Database Models - Updated for Authentication System
"""
import os
import uuid
from py4web import action, request, abort, redirect, URL
from py4web.utils.form import Form, FormStyleBulma
from pydal import DAL, Field
from datetime import datetime, timedelta
import json

# Import db from common
from .common import db

# Families table - now with owner tracking
db.define_table(
    'families',
    Field('family_name', 'string', length=100, required=True),
    Field('owner_id', 'reference auth_user', required=True),  # NEW: Track owner
    Field('created_by', 'string', length=100),  # Keep for display
    Field('created_at', 'datetime', default=datetime.utcnow),
    # Remove access_code - no longer needed
    format='%(family_name)s'
)

# NEW: Family Members table - tracks user access to family trees
db.define_table(
    'family_members',
    Field('user_id', 'reference auth_user', required=True),
    Field('family_id', 'reference families', required=True),
    Field('role', 'string', length=20, required=True),  # 'owner', 'member', 'editor', 'viewer'
    Field('invited_by', 'reference auth_user', required=True),
    Field('joined_at', 'datetime', default=datetime.utcnow),
    Field('invited_at', 'datetime', default=datetime.utcnow),
    Field('is_active', 'boolean', default=True),
    format='%(user_id)s in %(family_id)s as %(role)s'
)

# Ensure unique user-family combinations
db.executesql('CREATE UNIQUE INDEX IF NOT EXISTS idx_family_members_unique ON family_members (user_id, family_id)')

# NEW: Family Invitations table - tracks pending invitations
db.define_table(
    'family_invitations',
    Field('family_id', 'reference families', required=True),
    Field('email', 'string', length=255, required=True),
    Field('role', 'string', length=20, required=True),
    Field('invited_by', 'reference auth_user', required=True),
    Field('invitation_token', 'string', length=64, unique=True, required=True),
    Field('expires_at', 'datetime', required=True),
    Field('used_at', 'datetime'),
    Field('created_at', 'datetime', default=datetime.utcnow),
    format='%(email)s invited to %(family_id)s'
)

# People table - enhanced with user tracking
db.define_table(
    'people',
    Field('family_id', 'reference families', required=True),
    Field('first_name', 'string', length=100, required=True),
    Field('last_name', 'string', length=100),
    Field('maiden_name', 'string', length=100),
    Field('nickname', 'string', length=50),
    Field('birth_date', 'date'),
    Field('death_date', 'date'),
    Field('birth_place', 'string', length=200),
    Field('is_living', 'boolean', default=True),
    Field('gender', 'string', length=20),
    Field('profile_photo', 'blob'),
    Field('profile_photo_filename', 'string', length=255),
    Field('bio_summary', 'text'),
    Field('tree_position_x', 'double', default=0),
    Field('tree_position_y', 'double', default=0),
    Field('generation_level', 'integer', default=0),
    Field('node_color', 'string', length=20, default='green'),
    Field('node_shape', 'string', length=20, default='circle'),
    # NEW: User tracking fields
    Field('created_by_user_id', 'reference auth_user'),
    Field('last_edited_by_user_id', 'reference auth_user'),
    Field('created_at', 'datetime', default=datetime.utcnow),
    Field('updated_at', 'datetime', default=datetime.utcnow, update=datetime.utcnow),
    format='%(first_name)s %(last_name)s'
)

# Relationships table - enhanced with user tracking
db.define_table(
    'relationships',
    Field('family_id', 'reference families', required=True),
    Field('person1_id', 'reference people', required=True),
    Field('person2_id', 'reference people', required=True),
    Field('relationship_type', 'string', length=50, required=True),
    Field('marriage_date', 'date'),
    Field('divorce_date', 'date'),
    Field('is_active', 'boolean', default=True),
    # NEW: User tracking
    Field('created_by_user_id', 'reference auth_user'),
    Field('created_at', 'datetime', default=datetime.utcnow),
    format='%(person1_id)s -> %(person2_id)s (%(relationship_type)s)'
)

# Stories table - enhanced with user tracking
db.define_table(
    'stories',
    Field('family_id', 'reference families', required=True),
    Field('person_id', 'reference people', required=True),
    Field('author_name', 'string', length=100, required=True),  # Keep for display
    Field('title', 'string', length=200, required=True),
    Field('theme', 'string', length=50, required=True),
    Field('time_period', 'string', length=100),
    Field('year_occurred', 'integer'),
    Field('questions_and_answers', 'json'),
    Field('story_text', 'text', required=True),
    Field('photo_data', 'blob'),
    Field('photo_filename', 'string', length=255),
    Field('is_featured', 'boolean', default=False),
    # NEW: User tracking fields
    Field('author_user_id', 'reference auth_user', required=True),
    Field('last_edited_by_user_id', 'reference auth_user'),
    Field('can_be_edited_by_others', 'boolean', default=True),
    Field('created_at', 'datetime', default=datetime.utcnow),
    Field('updated_at', 'datetime', default=datetime.utcnow, update=datetime.utcnow),
    format='%(title)s (%(person_id)s)'
)

# Theme questions table (unchanged)
db.define_table(
    'theme_questions',
    Field('theme', 'string', length=50, required=True),
    Field('question_text', 'text', required=True),
    Field('order_index', 'integer', default=0),
    Field('is_active', 'boolean', default=True),
    format='%(question_text)s'
)

# Tree settings - enhanced for dual roots
db.define_table(
    'tree_settings',
    Field('family_id', 'reference families', required=True, unique=True),
    Field('tree_style', 'string', length=50, default='classic'),
    Field('color_scheme', 'string', length=50, default='earth'),
    Field('show_photos', 'boolean', default=True),
    Field('show_dates', 'boolean', default=True),
    Field('show_places', 'boolean', default=False),
    Field('root_person_id', 'reference people'),
    # NEW: Dual root support
    Field('allow_dual_roots', 'boolean', default=False),
    Field('primary_root_person_id', 'reference people'),
    Field('secondary_root_person_id', 'reference people'),
    Field('background_settings', 'json'),
    Field('connection_line_settings', 'json'),
    Field('created_at', 'datetime', default=datetime.utcnow),
    Field('updated_at', 'datetime', default=datetime.utcnow, update=datetime.utcnow),
)

# Helper functions updated for authentication

def create_family_tree_with_owner(family_name, owner_user_id):
    """Create a new family tree with authenticated owner"""
    family_id = db.families.insert(
        family_name=family_name,
        owner_id=owner_user_id,
        created_by=get_user_display_name(owner_user_id)
    )
    
    # Add owner to family_members table
    db.family_members.insert(
        user_id=owner_user_id,
        family_id=family_id,
        role='owner',
        invited_by=owner_user_id,  # Self-invited
        joined_at=datetime.utcnow(),
        invited_at=datetime.utcnow()
    )
    
    # Create default tree settings
    db.tree_settings.insert(
        family_id=family_id,
        tree_style='classic',
        color_scheme='earth'
    )
    
    db.commit()
    return family_id

def get_user_display_name(user_id):
    """Get display name for user"""
    user = db.auth_user[user_id]
    if not user:
        return "Unknown User"
    
    if user.first_name and user.last_name:
        return f"{user.first_name} {user.last_name}"
    elif user.first_name:
        return user.first_name
    else:
        return user.email

# REPLACE the get_user_family_trees function in your models.py with this:

def get_user_family_trees(user_id):
    """Get all family trees a user has access to"""
    from types import SimpleNamespace
    
    # Join family_members with families to get user's trees
    query = (
        (db.family_members.user_id == user_id) &
        (db.family_members.is_active == True) &
        (db.family_members.family_id == db.families.id)
    )
    
    rows = db(query).select(
        db.families.ALL,
        db.family_members.role,
        orderby=db.families.family_name
    )
    
    family_trees = []
    for row in rows:
        family = row.families
        member = row.family_members
        
        # Get additional stats
        member_count = db(db.family_members.family_id == family.id).count()
        story_count = db(db.stories.family_id == family.id).count()
        
        # Create a proper object-like structure that works with dot notation
        tree_data = SimpleNamespace()
        tree_data.id = family.id
        tree_data.family_name = family.family_name
        tree_data.created_at = family.created_at
        tree_data.user_role = member.role.title()
        tree_data.member_count = member_count
        tree_data.story_count = story_count
        tree_data.owner_id = family.owner_id
        tree_data.created_by = family.created_by
        
        family_trees.append(tree_data)
    
    return family_trees

def check_user_permission(user_id, family_id, required_permission):
    """Check if user has required permission for family tree"""
    # Get user's role in this family
    member = db(
        (db.family_members.user_id == user_id) &
        (db.family_members.family_id == family_id) &
        (db.family_members.is_active == True)
    ).select().first()
    
    if not member:
        return False
    
    # Permission hierarchy
    permissions = {
        'owner': ['view', 'edit', 'manage', 'invite', 'admin'],
        'member': ['view', 'edit', 'invite'],
        'editor': ['view', 'edit'],
        'viewer': ['view']
    }
    
    user_permissions = permissions.get(member.role, [])
    return required_permission in user_permissions

def create_family_invitation(family_id, email, role, invited_by_user_id):
    """Create a family invitation"""
    # Generate unique token
    invitation_token = str(uuid.uuid4())
    
    # Set expiration to 7 days from now
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    invitation_id = db.family_invitations.insert(
        family_id=family_id,
        email=email,
        role=role,
        invited_by=invited_by_user_id,
        invitation_token=invitation_token,
        expires_at=expires_at
    )
    
    db.commit()
    return invitation_token

def process_family_invitation(invitation_token, user_id):
    """Process a family invitation when user accepts"""
    # Find valid invitation
    invitation = db(
        (db.family_invitations.invitation_token == invitation_token) &
        (db.family_invitations.used_at == None) &
        (db.family_invitations.expires_at > datetime.utcnow())
    ).select().first()
    
    if not invitation:
        return False, "Invalid or expired invitation"
    
    # Check if user is already a member
    existing_member = db(
        (db.family_members.user_id == user_id) &
        (db.family_members.family_id == invitation.family_id) &
        (db.family_members.is_active == True)
    ).select().first()
    
    if existing_member:
        return False, "You are already a member of this family tree"
    
    # Add user to family
    db.family_members.insert(
        user_id=user_id,
        family_id=invitation.family_id,
        role=invitation.role,
        invited_by=invitation.invited_by,
        joined_at=datetime.utcnow(),
        invited_at=invitation.created_at
    )
    
    # Mark invitation as used
    db(db.family_invitations.id == invitation.id).update(
        used_at=datetime.utcnow()
    )
    
    db.commit()
    
    # Get family info
    family = db.families[invitation.family_id]
    return True, f"Successfully joined {family.family_name}!"

# Updated helper functions to work with new schema

def get_family_tree_data(family_id):
    """Get all people and relationships for a family tree"""
    people = db(db.people.family_id == family_id).select()
    relationships = db(db.relationships.family_id == family_id).select()
    
    # Convert to dict format for easy JSON serialization
    people_data = []
    for person in people:
        people_data.append({
            'id': person.id,
            'first_name': person.first_name,
            'last_name': person.last_name or '',
            'full_name': f"{person.first_name} {person.last_name or ''}".strip(),
            'maiden_name': person.maiden_name,
            'nickname': person.nickname,
            'birth_date': person.birth_date.isoformat() if person.birth_date else None,
            'death_date': person.death_date.isoformat() if person.death_date else None,
            'birth_place': person.birth_place,
            'is_living': person.is_living,
            'gender': person.gender,
            'bio_summary': person.bio_summary,
            'has_photo': bool(person.profile_photo),
            'generation_level': person.generation_level,
            'tree_position_x': person.tree_position_x,
            'tree_position_y': person.tree_position_y,
            'node_color': person.node_color or 'green',
            'node_shape': person.node_shape or 'circle',
            'created_by': get_user_display_name(person.created_by_user_id) if person.created_by_user_id else None
        })
    
    relationships_data = []
    for rel in relationships:
        relationships_data.append({
            'id': rel.id,
            'person1_id': rel.person1_id,
            'person2_id': rel.person2_id,
            'relationship_type': rel.relationship_type,
            'marriage_date': rel.marriage_date.isoformat() if rel.marriage_date else None,
            'divorce_date': rel.divorce_date.isoformat() if rel.divorce_date else None,
            'is_active': rel.is_active
        })
    
    return {
        'people': people_data,
        'relationships': relationships_data
    }

def add_person(family_id, first_name, last_name=None, created_by_user_id=None, **kwargs):
    """Add a new person to the family tree"""
    try:
        print(f"DEBUG: add_person called with family_id={family_id}, first_name={first_name}")
        
        person_data = {
            'family_id': family_id,
            'first_name': first_name,
            'last_name': last_name,
            'created_by_user_id': created_by_user_id,
            'last_edited_by_user_id': created_by_user_id,
        }
        
        # Add all additional kwargs
        person_data.update(kwargs)
        
        print(f"DEBUG: Inserting person with data: {person_data}")
        
        person_id = db.people.insert(**person_data)
        db.commit()
        
        print(f"DEBUG: Person created successfully with ID: {person_id}")
        return person_id
        
    except Exception as e:
        print(f"ERROR in add_person: {e}")
        db.rollback()
        raise e

def save_person_story(family_id, person_id, author_user_id, **kwargs):
    """Save a story for a specific person"""
    story_id = db.stories.insert(
        family_id=family_id,
        person_id=person_id,
        author_user_id=author_user_id,
        last_edited_by_user_id=author_user_id,
        **kwargs
    )
    db.commit()
    return story_id

# Keep existing functions but update them for new schema
def add_relationship(family_id, person1_id, person2_id, relationship_type, created_by_user_id=None, **kwargs):
    """Create a relationship between two people"""
    # Avoid duplicate relationships
    existing = db(
        (db.relationships.family_id == family_id) &
        (db.relationships.person1_id == person1_id) &
        (db.relationships.person2_id == person2_id) &
        (db.relationships.relationship_type == relationship_type)
    ).select().first()
    
    if existing:
        return existing.id
    
    relationship_id = db.relationships.insert(
        family_id=family_id,
        person1_id=person1_id,
        person2_id=person2_id,
        relationship_type=relationship_type,
        created_by_user_id=created_by_user_id,
        **kwargs
    )
    
    # Auto-create reciprocal relationship
    reciprocal_types = {
        'parent': 'child',
        'child': 'parent',
        'spouse': 'spouse',
        'sibling': 'sibling',
        'adopted_parent': 'adopted_child',
        'adopted_child': 'adopted_parent',
        'step_parent': 'step_child',
        'step_child': 'step_parent'
    }
    
    if relationship_type in reciprocal_types:
        reciprocal_type = reciprocal_types[relationship_type]
        db.relationships.insert(
            family_id=family_id,
            person1_id=person2_id,
            person2_id=person1_id,
            relationship_type=reciprocal_type,
            created_by_user_id=created_by_user_id,
            **kwargs
        )
    
    db.commit()
    return relationship_id

def get_person_stories(person_id):
    """Get all stories for a specific person"""
    stories = db(db.stories.person_id == person_id).select(
        orderby=~db.stories.is_featured | db.stories.created_at
    )
    
    stories_data = []
    for story in stories:
        stories_data.append({
            'id': story.id,
            'title': story.title,
            'author_name': story.author_name,
            'author_user_name': get_user_display_name(story.author_user_id) if story.author_user_id else story.author_name,
            'theme': story.theme,
            'time_period': story.time_period,
            'year_occurred': story.year_occurred,
            'questions_and_answers': story.questions_and_answers or [],
            'story_text': story.story_text,
            'has_photo': bool(story.photo_data),
            'is_featured': story.is_featured,
            'created_at': story.created_at.isoformat(),
            'can_edit': story.can_be_edited_by_others,
            'author_user_id': story.author_user_id
        })
    
    return stories_data

# Populate default theme questions (keep existing function)
def populate_default_questions():
    """Populate the database with default theme questions"""
    
    themes_and_questions = {
        'childhood': [
            "What was their childhood home like and where did they grow up?",
            "Who were their best friends and what adventures did they have?",
            "What were their favorite toys, games, or childhood activities?",
            "What was a typical day like for them as a child?",
            "What do you remember about their school years and education?",
            "What family traditions or rules shaped their childhood?"
        ],
        'personality': [
            "What was their personality like - were they outgoing, quiet, funny?",
            "What were their special talents or skills?",
            "What did they love to do in their free time?",
            "What were their hopes and dreams?",
            "What made them laugh or brought them joy?",
            "How did they handle challenges or difficult situations?"
        ],
        'family_life': [
            "How did they meet their spouse/partner and what was their love story?",
            "What kind of parent/grandparent were they?",
            "What family traditions did they create or continue?",
            "How did they celebrate holidays or special occasions?",
            "What values were most important to them?",
            "What legacy did they want to leave for their family?"
        ],
        'career': [
            "What was their career or life's work?",
            "What accomplishments were they most proud of?",
            "Who were important mentors or colleagues in their life?",
            "How did their work impact others or their community?",
            "What challenges did they overcome professionally?",
            "How did they balance work and family life?"
        ],
        'adventures': [
            "What was their most memorable trip or adventure?",
            "Tell about a time they moved or lived somewhere new.",
            "What's the most interesting place they visited or lived?",
            "Describe an experience that pushed them out of their comfort zone.",
            "What different communities or cultures did they experience?",
            "How did travel or new experiences change them?"
        ],
        'relationships': [
            "Who were the most important people in their life?",
            "Tell about a friendship that really mattered to them.",
            "What did they teach others about love and relationships?",
            "Who influenced them the most and how?",
            "How did they maintain relationships over time and distance?",
            "What made their relationships with others special?"
        ],
        'wisdom': [
            "What life lessons did they learn and share with others?",
            "What advice would they give to younger generations?",
            "How did they find strength during difficult times?",
            "What were they most grateful for in life?",
            "What did they learn from their mistakes or failures?",
            "What would they want to be remembered for?"
        ],
        'memories': [
            "What's your favorite memory of time spent with them?",
            "What's a funny story or joke they used to tell?",
            "What did they do that made you feel special or loved?",
            "What traditions or habits do you remember about them?",
            "How did they make ordinary moments feel special?",
            "What do you miss most about them or treasure most?"
        ],
        'general': [
            "What was happening in their life during this time period?",
            "What do you remember most about them from this era?",
            "What were they working toward or hoping for?",
            "How were they feeling during this time in their life?",
            "What was important to them during this period?",
            "What made this time in their life special or memorable?"
        ]
    }
    
    # Only populate if the table is empty
    if db(db.theme_questions).count() == 0:
        for theme, questions in themes_and_questions.items():
            for i, question in enumerate(questions):
                db.theme_questions.insert(
                    theme=theme,
                    question_text=question,
                    order_index=i
                )
        db.commit()

# Keep other existing helper functions
def calculate_tree_positions(family_id, root_person_id=None):
    """Calculate optimal positions for tree layout"""
    # Implementation remains the same
    pass

def update_generation_levels(family_id):
    """Update generation levels based on relationships"""
    # Implementation remains the same
    pass

# Initialize database with default questions
populate_default_questions()

# Commit and close db connection properly
db.commit()