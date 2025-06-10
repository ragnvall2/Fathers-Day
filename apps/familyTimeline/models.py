"""
Family Timeline Database Models
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

# Families table - for sharing timelines among family members
db.define_table(
    'families',
    Field('family_name', 'string', length=100, required=True),
    Field('access_code', 'string', length=20, required=True, unique=True),
    Field('created_by', 'string', length=100),
    Field('created_at', 'datetime', default=datetime.utcnow),
    format='%(family_name)s'
)

# Memories table - stores all the family stories
db.define_table(
    'memories',
    Field('family_id', 'reference families', required=True),
    Field('year', 'integer', required=True),
    Field('title', 'string', length=200, required=True),
    Field('author', 'string', length=100, required=True),
    Field('theme', 'string', length=50, required=True),
    Field('questions_and_answers', 'json'),  # Stores array of Q&A pairs
    Field('story_text', 'text'),
    Field('photo_filename', 'string', length=255),
    Field('photo_data', 'blob'),  # Store photo binary data
    Field('created_at', 'datetime', default=datetime.utcnow),
    Field('updated_at', 'datetime', default=datetime.utcnow, update=datetime.utcnow),
    format='%(title)s (%(year)s)'
)

# Theme questions table - stores the questions for each theme
db.define_table(
    'theme_questions',
    Field('theme', 'string', length=50, required=True),
    Field('question_text', 'text', required=True),
    Field('order_index', 'integer', default=0),
    Field('is_active', 'boolean', default=True),
    format='%(question_text)s'
)

# Create default theme questions
def populate_default_questions():
    """Populate the database with default theme questions"""
    
    themes_and_questions = {
        'childhood': [
            "What was your childhood home like and how did it feel to live there?",
            "Who was your best friend growing up and what adventures did you have together?",
            "What was your favorite toy, game, or activity as a child?",
            "Tell me about a typical day when you were young - what did you do for fun?",
            "What was school like for you? Who were your favorite teachers?",
            "What family rules or traditions do you remember from childhood?"
        ],
        'family': [
            "How did you meet your spouse/partner and what was that experience like?",
            "What do you remember about when your children were born?",
            "Tell me about your parents - what were they like and what did you learn from them?",
            "What family traditions or holidays were most important to you?",
            "How did your family handle difficult times together?",
            "What values did you want to pass down to your children?"
        ],
        'career': [
            "What was your first job like and how did you feel about working?",
            "What accomplishment in your career are you most proud of?",
            "Who was your most memorable boss, colleague, or mentor?",
            "How did your work change over the years and what did you learn?",
            "What was the biggest challenge you faced professionally?",
            "How did you balance work and family life?"
        ],
        'travel': [
            "What was the most memorable trip you ever took and why?",
            "Tell me about a time you moved to a new place - how did it feel?",
            "What's the most beautiful or interesting place you've ever seen?",
            "Describe an adventure that pushed you out of your comfort zone.",
            "What different cultures or communities have you experienced?",
            "How has travel changed your perspective on life?"
        ],
        'milestones': [
            "What was your graduation day like and how did it feel to achieve that goal?",
            "Tell me about your wedding day or another important celebration.",
            "What's an achievement that you're particularly proud of?",
            "Describe a moment when you felt like you had grown or changed as a person.",
            "What was a major decision that shaped your life?",
            "How did you celebrate important moments with loved ones?"
        ],
        'everyday': [
            "What was a typical day like for you during this time period?",
            "What hobbies or activities brought you the most joy?",
            "How did you spend your free time and who did you spend it with?",
            "What was your community or neighborhood like?",
            "What did you enjoy most about your daily routines?",
            "How did you stay connected with friends and family?"
        ],
        'challenges': [
            "Tell me about a difficult time and how you got through it.",
            "What's the most important lesson you learned from a challenge?",
            "How did you find strength during tough times?",
            "What advice would you give to someone facing a similar situation?",
            "Who helped you through difficult periods in your life?",
            "How did overcoming challenges change you as a person?"
        ],
        'relationships': [
            "Who has been the most important person in your life and why?",
            "Tell me about a friendship that really mattered to you.",
            "What did you learn about love and relationships over the years?",
            "Who influenced you the most and how did they change your life?",
            "How did you maintain close relationships over time?",
            "What makes a relationship meaningful to you?"
        ],
        'general': [
            "What was the most important thing that happened this year?",
            "What do you remember most about this time in your life?",
            "How were you feeling during this period?",
            "What was happening in the world around you that affected your life?",
            "What were you hoping for or working toward during this time?",
            "What made this year special or memorable?"
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

# Helper functions
def create_family(family_name, created_by):
    """Create a new family timeline"""
    access_code = str(uuid.uuid4())[:8].upper()
    family_id = db.families.insert(
        family_name=family_name,
        access_code=access_code,
        created_by=created_by
    )
    db.commit()
    return family_id, access_code

def get_family_by_code(access_code):
    """Get family by access code"""
    return db(db.families.access_code == access_code).select().first()

def get_memories_by_year(family_id, year=None):
    """Get memories for a family, optionally filtered by year"""
    query = db.memories.family_id == family_id
    if year:
        query &= db.memories.year == year
    return db(query).select(orderby=db.memories.created_at)

def get_questions_by_theme(theme):
    """Get all questions for a specific theme"""
    return db(
        (db.theme_questions.theme == theme) & 
        (db.theme_questions.is_active == True)
    ).select(orderby=db.theme_questions.order_index)

def save_memory(family_id, year, title, author, theme, questions_answers, story_text, photo_data=None, photo_filename=None):
    """Save a new memory to the database"""
    memory_id = db.memories.insert(
        family_id=family_id,
        year=year,
        title=title,
        author=author,
        theme=theme,
        questions_and_answers=questions_answers,
        story_text=story_text,
        photo_data=photo_data,
        photo_filename=photo_filename
    )
    db.commit()
    return memory_id

# Initialize database with default questions
populate_default_questions()

# Commit and close db connection properly
db.commit()