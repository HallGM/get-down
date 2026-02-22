# Architecture & Scalability Guide

## Current Structure (Single File)

The current `app.py` is a monolithic Flask application suitable for:

- Small to medium applications
- Single domain logic
- Easy local development

```
app.py (all routes and logic)
```

## Future: Scalable Structure with Blueprints

When the application grows, consider this modular structure:

```
project/
├── app.py                    # Application factory
├── config.py                 # Configuration classes
├── requirements.txt          # Dependencies
├── gunicorn_config.py       # Gunicorn configuration
│
├── app/                      # Main application package
│   ├── __init__.py          # App factory
│   ├── models.py            # Data models (if needed)
│   │
│   ├── blueprints/          # Feature modules
│   │   ├── invoice/
│   │   │   ├── __init__.py  # Blueprint registration
│   │   │   ├── routes.py    # Invoice routes
│   │   │   └── utils.py     # Invoice utilities
│   │   │
│   │   ├── receipt/
│   │   │   ├── __init__.py
│   │   │   ├── routes.py
│   │   │   └── utils.py
│   │   │
│   │   └── api/             # Optional: REST API
│   │       ├── __init__.py
│   │       └── routes.py
│   │
│   ├── static/              # CSS, JS, images
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   │
│   └── templates/           # Jinja2 templates
│       ├── base.html
│       ├── form.html
│       └── errors/
│
├── services/                # Business logic layer
│   ├── __init__.py
│   ├── invoice_service.py
│   ├── receipt_service.py
│   └── pdf_service.py
│
└── tests/                   # Unit tests
    ├── test_invoice.py
    ├── test_receipt.py
    └── test_api.py
```

## Migration Steps (When Needed)

### Step 1: Create App Factory

Replace monolithic `app.py` with:

```python
# app/__init__.py
from flask import Flask

def create_app(config_name='production'):
    app = Flask(__name__)

    # Load config
    if config_name == 'development':
        app.config['DEBUG'] = True

    # Register blueprints
    from app.blueprints.invoice import invoice_bp
    from app.blueprints.receipt import receipt_bp
    app.register_blueprint(invoice_bp)
    app.register_blueprint(receipt_bp)

    return app
```

### Step 2: Create Blueprints

```python
# app/blueprints/invoice/__init__.py
from flask import Blueprint
from .routes import *

invoice_bp = Blueprint('invoice', __name__, url_prefix='/invoice')

# app/blueprints/invoice/routes.py
from flask import render_template, request, jsonify, send_file
from app.services.invoice_service import generate_invoice_pdf

@invoice_bp.route('/generate', methods=['POST'])
def generate():
    # Route logic here
    pass
```

### Step 3: Extract Services

```python
# services/invoice_service.py
class InvoiceService:
    @staticmethod
    def generate_pdf(options):
        # PDF generation logic
        pass

    @staticmethod
    def validate_input(data):
        # Input validation
        pass
```

### Step 4: Add Tests

```python
# tests/test_invoice.py
import pytest
from app import create_app

def test_invoice_generation():
    app = create_app('testing')
    with app.test_client() as client:
        response = client.post('/invoice/generate', json={...})
        assert response.status_code == 200
```

## When to Migrate

Migrate to blueprints when:

- ✅ Adding multiple independent features
- ✅ Team size grows (2+ developers)
- ✅ Code reaches 500+ lines per route file
- ✅ Need automated testing
- ✅ Planning API versioning

Don't migrate if:

- ❌ Still a solo project
- ❌ Simple, focused functionality
- ❌ Keeping deployment simple

## Database Integration (Future)

When adding a database:

```python
# config.py
import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'sqlite:///invoice.db'
    )

# app/__init__.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    # Create tables
    with app.app_context():
        db.create_all()

    return app
```

## API Expansion (Future)

```python
# app/blueprints/api/v1/routes.py
from flask import Blueprint, jsonify

api_v1 = Blueprint('api_v1', __name__, url_prefix='/api/v1')

@api_v1.route('/invoices', methods=['GET'])
def list_invoices():
    return jsonify([...])

@api_v1.route('/invoices/<invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    return jsonify({...})
```

## Deployment Considerations

### Single File (Current)

- ✅ Simple
- ✅ Fast to deploy
- ✅ Easier debugging
- ❌ Less organized

### Blueprints (Future)

- ✅ Organized
- ✅ Scalable
- ✅ Testable
- ❌ Slightly more complex

Both structures deploy the same way to Render—no deployment changes needed.

## Monitoring & Logging

Regardless of structure, add monitoring:

```python
# app/__init__.py
import logging
from pythonjsonlogger import jsonlogger

def setup_logging(app):
    handler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter()
    handler.setFormatter(formatter)
    app.logger.addHandler(handler)
```

This JSON logging integrates better with production monitoring tools.

## Summary

- **Now**: Keep monolithic structure—works great
- **Later**: Migrate to blueprints + services when needed
- **Goal**: Simple today, scalable tomorrow
