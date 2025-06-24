"""
Family Tree Database Models - Updated for Tree Structure
"""
import os
import uuid
from py4web import action, request, abort, redirect, URL
from py4web.utils.form import Form, FormStyleBulma
from pydal import DAL, Field
from datetime import datetime
import json

# Import db from common
from .common import db

# Families table - for sharing family trees among family members
db.define_table(
    'families',
    Field('family_name', 'string', length=100, required=True),
    Field('access_code', 'string', length=20, required=True, unique=True),
    Field('created_by', 'string', length=100),
    Field('created_at', 'datetime', default=datetime.utcnow),
    format='%(family_name)s'
)

# People table - stores individual family members
db.define_table(
    'people',
    Field('family_id', 'reference families', required=True),
    Field('first_name', 'string', length=100, required=True),
    Field('last_name', 'string', length=100),
    Field('maiden_name', 'string', length=100),  # For married names
    Field('nickname', 'string', length=50),
    Field('birth_date', 'date'),
    Field('death_date', 'date'),
    Field('birth_place', 'string', length=200),
    Field('is_living', 'boolean', default=True),
    Field('gender', 'string', length=20),  # 'male', 'female', 'other'
    Field('profile_photo', 'blob'),
    Field('profile_photo_filename', 'string', length=255),
    Field('bio_summary', 'text'),  # Short biography
    Field('tree_position_x', 'double', default=0),  # For tree layout
    Field('tree_position_y', 'double', default=0),
    Field('generation_level', 'integer', default=0),  # 0=root, 1=children, -1=parents
    Field('created_at', 'datetime', default=datetime.utcnow),
    Field('updated_at', 'datetime', default=datetime.utcnow, update=datetime.utcnow),
    format='%(first_name)s %(last_name)s'
)

# Relationships table - defines family connections
db.define_table(
    'relationships',
    Field('family_id', 'reference families', required=True),
    Field('person1_id', 'reference people', required=True),
    Field('person2_id', 'reference people', required=True),
    Field('relationship_type', 'string', length=50, required=True), 
    # Types: 'parent', 'child', 'spouse', 'sibling', 'adopted_parent', 'adopted_child', 'step_parent', 'step_child'
    Field('marriage_date', 'date'),  # For spouse relationships
    Field('divorce_date', 'date'),   # For divorced spouses
    Field('is_active', 'boolean', default=True),
    Field('created_at', 'datetime', default=datetime.utcnow),
    format='%(person1_id)s -> %(person2_id)s (%(relationship_type)s)'
)

# Stories table - modified to be person-centric instead of year-centric
db.define_table(
    'stories',
    Field('family_id', 'reference families', required=True),
    Field('person_id', 'reference people', required=True),  # Who the story is about
    Field('author_name', 'string', length=100, required=True),  # Who wrote it
    Field('title', 'string', length=200, required=True),
    Field('theme', 'string', length=50, required=True),
    Field('time_period', 'string', length=100),  # "Childhood", "1950s", "College Years", etc.
    Field('year_occurred', 'integer'),  # Approximate year if known
    Field('questions_and_answers', 'json'),  # Array of Q&A pairs
    Field('story_text', 'text', required=True),
    Field('photo_data', 'blob'),
    Field('photo_filename', 'string', length=255),
    Field('is_featured', 'boolean', default=False),  # Highlight important stories
    Field('created_at', 'datetime', default=datetime.utcnow),
    Field('updated_at', 'datetime', default=datetime.utcnow, update=datetime.utcnow),
    format='%(title)s (%(person_id)s)'
)

# Keep theme questions table but expand it
db.define_table(
    'theme_questions',
    Field('theme', 'string', length=50, required=True),
    Field('question_text', 'text', required=True),
    Field('order_index', 'integer', default=0),
    Field('is_active', 'boolean', default=True),
    format='%(question_text)s'
)

# Family tree settings - for customizing tree appearance per family
db.define_table(
    'tree_settings',
    Field('family_id', 'reference families', required=True, unique=True),
    Field('tree_style', 'string', length=50, default='classic'),  # 'classic', 'modern', 'natural'
    Field('color_scheme', 'string', length=50, default='earth'),   # 'earth', 'ocean', 'sunset'
    Field('show_photos', 'boolean', default=True),
    Field('show_dates', 'boolean', default=True),
    Field('show_places', 'boolean', default=False),
    Field('root_person_id', 'reference people'),  # Starting point of tree
    Field('created_at', 'datetime', default=datetime.utcnow),
    Field('updated_at', 'datetime', default=datetime.utcnow, update=datetime.utcnow)
)

# Helper functions for family tree operations
def get_family_by_code(access_code):
    """Get family by access code"""
    family = db(db.families.access_code == access_code.upper()).select().first()
    return family

def create_family_tree(family_name, created_by):
    """Create a new family tree"""
    access_code = str(uuid.uuid4())[:8].upper()
    family_id = db.families.insert(
        family_name=family_name,
        access_code=access_code,
        created_by=created_by
    )
    
    # Create default tree settings
    db.tree_settings.insert(
        family_id=family_id,
        tree_style='classic',
        color_scheme='earth'
    )
    
    db.commit()
    return family_id, access_code

def add_person(family_id, first_name, last_name=None, **kwargs):
    """Add a new person to the family tree"""
    person_id = db.people.insert(
        family_id=family_id,
        first_name=first_name,
        last_name=last_name,
        **kwargs
    )
    db.commit()
    return person_id

def add_relationship(family_id, person1_id, person2_id, relationship_type, **kwargs):
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
            **kwargs
        )
    
    db.commit()
    return relationship_id

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
            'tree_position_y': person.tree_position_y
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
            'theme': story.theme,
            'time_period': story.time_period,
            'year_occurred': story.year_occurred,
            'questions_and_answers': story.questions_and_answers or [],
            'story_text': story.story_text,
            'has_photo': bool(story.photo_data),
            'is_featured': story.is_featured,
            'created_at': story.created_at.isoformat()
        })
    
    return stories_data

def save_person_story(family_id, person_id, title, author_name, theme, story_text, **kwargs):
    """Save a story for a specific person"""
    story_id = db.stories.insert(
        family_id=family_id,
        person_id=person_id,
        title=title,
        author_name=author_name,
        theme=theme,
        story_text=story_text,
        **kwargs
    )
    db.commit()
    return story_id

def get_family_by_code(access_code):
    """Get family by access code"""
    family = db(db.families.access_code == access_code.upper()).select().first()
    return family

def calculate_tree_positions(family_id, root_person_id=None):
    """Calculate optimal positions for tree layout"""
    # This is a simplified version - in practice you'd want more sophisticated tree layout algorithms
    people = db(db.people.family_id == family_id).select()
    relationships = db(db.relationships.family_id == family_id).select()
    
    # Find root person (oldest generation or specified root)
    if not root_person_id:
        root_person = people.select().first()  # Simple fallback
        if root_person:
            root_person_id = root_person.id
    
    # Basic positioning algorithm (can be enhanced later)
    generation_levels = {}
    positions = {}
    
    # Start with root at center
    if root_person_id:
        positions[root_person_id] = {'x': 0, 'y': 0, 'generation': 0}
    
    # Update positions in database
    for person_id, pos in positions.items():
        db(db.people.id == person_id).update(
            tree_position_x=pos['x'],
            tree_position_y=pos['y'],
            generation_level=pos['generation']
        )
    
    db.commit()
    return positions

def update_generation_levels(family_id):
    """Update generation levels based on relationships"""
    people = db(db.people.family_id == family_id).select()
    relationships = db(db.relationships.family_id == family_id).select()
    
    # Simple algorithm: find root couple (generation 0), then assign levels
    root_couple = []
    
    # Find a spouse relationship as potential root
    spouse_rels = [r for r in relationships if r.relationship_type == 'spouse']
    if spouse_rels:
        first_spouse_rel = spouse_rels[0]
        root_couple = [first_spouse_rel.person1_id, first_spouse_rel.person2_id]
        
        # Set root couple to generation 0
        for person_id in root_couple:
            db(db.people.id == person_id).update(generation_level=0)
    
    # Set children to generation 1, grandchildren to 2, etc.
    parent_child_rels = [r for r in relationships if r.relationship_type == 'parent']
    
    for rel in parent_child_rels:
        parent = db.people[rel.person1_id]
        child_id = rel.person2_id
        
        if parent:
            child_generation = (parent.generation_level or 0) + 1
            db(db.people.id == child_id).update(generation_level=child_generation)
    
    db.commit()

# Populate default theme questions (updated for person-centric stories)
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

# Initialize database with default questions
populate_default_questions()

# Commit and close db connection properly
db.commit()