# Family Memory Timeline 📚✨

A beautiful, interactive web application for families to collaboratively create and preserve their stories across generations. Built with py4web, this timeline allows family members to add memories, answer guided questions, and upload photos to create a rich digital legacy.

![Family Timeline Screenshot](screenshot.png)

## 🌟 Features

### 📖 **Guided Storytelling**
- **9 themed categories**: Childhood, Family, Career, Travel, Milestones, Everyday Life, Challenges, Relationships, and General
- **Multiple questions per theme**: Select and answer relevant questions that guide meaningful storytelling
- **Rich text stories**: Combine guided answers with free-form narrative

### 🎯 **Interactive Timeline**
- **Visual year-by-year timeline** (1930-2025) with hover effects and animations
- **Golden nodes** indicate years with memories - watch them pulse with life!
- **Memory counts** show how many stories exist for each year
- **Zoom controls** to navigate decades or focus on specific periods

### 👨‍👩‍👧‍👦 **Family Collaboration**
- **Shared access codes** - one timeline, multiple contributors
- **Author attribution** - see who wrote each memory
- **No authentication required** - easy for elderly family members to use
- **Real-time updates** when family members add new stories

### 📸 **Rich Media Support**
- **Photo uploads** with each memory
- **Automatic image optimization**
- **Secure photo storage** in the database

### 💎 **Beautiful Design**
- **Warm, elegant styling** with earth tones and serif fonts
- **Responsive design** works on phones, tablets, and desktop
- **Smooth animations** and hover effects
- **Intuitive user interface** designed for all ages

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ 
- pip (Python package manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/family-timeline.git
   cd family-timeline
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up py4web app structure**
   ```bash
   # If you don't have py4web apps folder yet:
   py4web setup apps
   
   # Copy the family timeline app:
   cp -r familyTimeline/ apps/
   ```

4. **Run the application**
   ```bash
   py4web run apps
   ```

5. **Open your browser**
   Navigate to `http://localhost:8000/familyTimeline`

## 📁 Project Structure

```
familyTimeline/
├── README.md                 # This file
├── requirements.txt          # Python dependencies
├── models.py                 # Database models and helper functions
├── controllers.py            # Web routes and API endpoints
├── common.py                 # Shared py4web setup (auto-generated)
├── templates/
│   ├── index.html           # Main timeline interface
│   ├── layout.html          # Base template (optional)
│   ├── create.html          # Create family page (to be added)
│   └── join.html            # Join family page (to be added)
├── static/
│   ├── css/
│   │   └── style.css        # Enhanced timeline styling
│   └── js/
│       └── timeline.js      # Interactive timeline logic
├── databases/               # SQLite database files (auto-created)
│   └── storage.db
└── uploads/                 # Photo uploads (if using file storage)
```

## 🎯 How to Use

### Creating Your First Family Timeline

1. **Visit the app** at `http://localhost:8000/familyTimeline`
2. **Click "Create Timeline"** 
3. **Enter family name** and your name as the creator
4. **Share the access code** with family members
5. **Start adding memories!**

### Adding a Memory

1. **Click "Add Memory"** or click on any year node
2. **Fill in the details**:
   - Year when the memory occurred
   - Title for your memory
   - Your name as the author
   - Choose a theme (Childhood, Family, etc.)
3. **Select relevant questions** from the theme
4. **Answer the questions** that resonate with you
5. **Write your story** in the main text area
6. **Upload a photo** (optional)
7. **Save** and watch the timeline update!

### Joining an Existing Timeline

1. Get the **access code** from a family member
2. Visit the timeline app
3. Click **"Join Family"**
4. Enter the access code
5. Start exploring and adding your own memories!

## 🛠️ Database Schema

### Tables

**families**
- `id` - Primary key
- `family_name` - Name of the family timeline
- `access_code` - Unique 8-character sharing code
- `created_by` - Name of the creator
- `created_at` - Timestamp

**memories**
- `id` - Primary key
- `family_id` - Reference to families table
- `year` - Year the memory occurred (1930-2025)
- `title` - Short title for the memory
- `author` - Name of the person who wrote it
- `theme` - Category (childhood, family, etc.)
- `questions_and_answers` - JSON array of Q&A pairs
- `story_text` - Main narrative text
- `photo_data` - Binary photo data
- `photo_filename` - Original filename
- `created_at` - When memory was added

**theme_questions**
- `id` - Primary key
- `theme` - Theme category
- `question_text` - The question text
- `order_index` - Display order
- `is_active` - Whether question is available

## 🎨 Themes and Questions

### Childhood
- What was your childhood home like?
- Who was your best friend growing up?
- What was your favorite toy or game?
- Tell me about a typical day when you were young
- What was school like for you?
- What family rules do you remember?

### Family
- How did you meet your spouse/partner?
- What do you remember about when your children were born?
- Tell me about your parents
- What family traditions were important?
- How did your family handle difficult times?
- What values did you want to pass down?

### Career
- What was your first job like?
- What career accomplishment are you most proud of?
- Who was your most memorable colleague or mentor?
- How did your work change over the years?
- What was your biggest professional challenge?
- How did you balance work and family?

*[And 6 more themes with 6 questions each...]*

## 🔧 Customization

### Adding New Themes
1. Add questions to the database:
   ```python
   db.theme_questions.insert(
       theme='your_theme',
       question_text='Your question here?',
       order_index=0
   )
   ```

2. Update the theme display names in `controllers.py`

### Styling Changes
- Edit `static/css/style.css` for visual customizations
- Timeline colors, fonts, and animations can be modified
- Responsive breakpoints for mobile devices

### Extending Functionality
- Add user authentication for private timelines
- Export timelines as PDF books
- Email notifications for new memories
- Advanced search and filtering
- Memory editing and deletion

## 🚀 Deployment

### Local Development
```bash
py4web run apps --watch  # Auto-reload on file changes
```

### Production Deployment

**Option 1: Simple deployment**
```bash
py4web run apps --host=0.0.0.0 --port=8000
```

**Option 2: With Gunicorn**
```bash
gunicorn -w 4 -b 0.0.0.0:8000 py4web.core:main
```

**Option 3: Cloud platforms**
- **Heroku**: Add `Procfile` with `web: py4web run apps --host=0.0.0.0 --port=$PORT`
- **Railway**: Direct deployment from GitHub
- **DigitalOcean**: Deploy on App Platform
- **PythonAnywhere**: Upload files and configure WSGI

### Environment Variables
```bash
# Optional: Set database location
export DATABASE_URL="sqlite:///path/to/your/db.sqlite"

# Optional: Set secret key for sessions
export SECRET_KEY="your-secret-key-here"
```

## 🔒 Privacy & Security

### Data Storage
- **Local database**: All data stored in SQLite file
- **No external services**: Photos and stories never leave your server
- **Family-controlled**: Only people with access codes can view/add

### Access Control
- **Access codes**: 8-character unique codes for each family
- **No public access**: Timelines are private by default
- **No user accounts**: Simple, password-free sharing

### Backup Recommendations
```bash
# Backup your database regularly
cp apps/familyTimeline/databases/storage.db backups/timeline-backup-$(date +%Y%m%d).db

# Or set up automated backups
crontab -e
# Add: 0 2 * * * cp /path/to/storage.db /path/to/backups/timeline-backup-$(date +\%Y\%m\%d).db
```

## 🤝 Contributing

We welcome contributions! Here's how to help:

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Areas for Contribution
- **New themes and questions**
- **UI/UX improvements**
- **Mobile responsiveness**
- **Export features** (PDF, EPUB)
- **Accessibility improvements**
- **Performance optimizations**
- **Documentation enhancements**

### Code Style
- Follow PEP 8 for Python code
- Use meaningful variable and function names
- Add comments for complex logic
- Test all new features

## 🐛 Troubleshooting

### Common Issues

**"Failed to load familyTimeline"**
- Check that all files are in the correct `apps/familyTimeline/` directory
- Verify requirements are installed: `pip install -r requirements.txt`
- Check Python version is 3.8+

**"Database locked" errors**
- Stop the server and restart: `Ctrl+C` then `py4web run apps`
- Check file permissions on `databases/` folder

**Photos not uploading**
- Check file size (limit: 16MB)
- Verify image format (JPG, PNG, GIF supported)
- Ensure `databases/` folder has write permissions

**Timeline not displaying**
- Check browser console for JavaScript errors
- Try refreshing the page
- Verify `static/js/timeline.js` is loading

### Getting Help
1. Check this README for solutions
2. Look at the issue tracker on GitHub
3. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Your setup (OS, Python version, etc.)

## 📚 Technical Details

### Framework Stack
- **Backend**: py4web (Python web framework)
- **Database**: SQLite with PyDAL ORM
- **Frontend**: Vanilla JavaScript + HTML5 + CSS3
- **Styling**: Custom CSS with responsive design
- **Photos**: Base64 encoded in database

### Browser Compatibility
- **Chrome**: 80+
- **Firefox**: 75+
- **Safari**: 13+
- **Edge**: 80+
- **Mobile**: iOS Safari 13+, Chrome Android 80+

### Performance Notes
- **Database**: SQLite handles thousands of memories efficiently
- **Photos**: Compressed and optimized automatically
- **Loading**: Lazy loading for large timelines
- **Caching**: Browser caching for static assets

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💝 Acknowledgments

- **Inspired by**: Physical memory books and family journals
- **Built for**: Families who want to preserve their stories
- **Special thanks**: To all the families who will use this to preserve their precious memories

---

## 🎉 Start Your Family's Story Today!

Every family has stories worth preserving. Whether it's your grandmother's tales of growing up during wartime, your father's career adventures, or your children's funny childhood moments - this timeline helps capture them all.

**Create your family timeline now and start building a digital legacy that will be treasured for generations to come.**

---

*Made with ❤️ for families everywhere*