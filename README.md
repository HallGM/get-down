# Invoice Generation App - Production Ready

A Flask web application for generating professional invoices and receipts for Every Angle events.

## Quick Start

### Local Development
```bash
pip install -r requirements.txt
python app.py
```
Visit http://localhost:5000

### Production Deployment (Render.com)
```bash
# 1. Push to GitHub
git add . && git commit -m "Production ready" && git push

# 2. Create Web Service on Render.com
# 3. Configure:
Build:  pip install -r requirements.txt
Start:  gunicorn app:app --workers 3 --bind 0.0.0.0:$PORT --access-logfile - --error-logfile -
Env:    FLASK_ENV=production, DEBUG=false, SECRET_KEY=(auto-generate)
```

## Features

- **Invoice Generation**: Create professional invoices with preset services or custom items
- **Receipt Generation**: Generate receipts for payments received
- **PDF Export**: Automatically generates PDF files for download
- **Service Presets**: Pre-configured service options with pricing
- **Customizable**: Support for discounts, travel costs, additional charges, and payments

## Project Structure

```
.
├── app.py                  # Main Flask application
├── config.py               # Generic business configuration
├── ev_config.py            # Every Angle specific config
├── services.py             # Service presets
├── invoice.py              # Invoice base classes
├── invoice_ev.py           # Every Angle invoice generation
├── generic_invoice.py      # PDF generation
├── requirements.txt        # Dependencies
├── render.yaml             # Render.com deployment config
├── Procfile                # Heroku/Render reference
├── gunicorn_config.py      # Advanced Gunicorn settings
├── templates/
│   └── form.html          # Invoice form UI
├── static/
│   └── logo.png           # Company logo
├── output/                # Generated invoices
└── README.md              # This file
```

## API Endpoints

### GET `/`
Renders the invoice generation form.

### POST `/generate`
Generates an invoice PDF.

**Request Body:**
```json
{
  "customer_name": "John Doe",
  "event_date": "2024-06-15",
  "venue": "Grand Hotel",
  "invoice_number": "INV-001",
  "preset_ids": ["singing_waiter_duet"],
  "custom_items": [
    {"description": "Custom service", "price": 150.00}
  ],
  "discount_percent": 10,
  "travel_cost": 50.00,
  "show_deposit": true
}
```

### POST `/generate-receipt`
Generates a receipt PDF (same request format as `/generate`).

## Configuration

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `FLASK_ENV` | production | Flask environment mode |
| `DEBUG` | false | Enable debug mode |
| `SECRET_KEY` | dev-key | Flask secret key |
| `PORT` | 5000 | Port to listen on |

**Local Development Override:**
```bash
DEBUG=true FLASK_ENV=development python app.py
```

## Dependencies

- Flask 3.0.0 - Web framework
- gunicorn 21.2.0 - Production WSGI server
- weasyprint 59.3 - HTML to PDF conversion
- PyYAML 6.0.1 - Configuration parsing
- python-dotenv 1.0.0 - Environment management

## Deployment

### Render.com Configuration

Use `render.yaml` or configure manually:

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
gunicorn app:app --workers 3 --bind 0.0.0.0:$PORT --access-logfile - --error-logfile -
```

**Environment Variables:**
- `FLASK_ENV` = production
- `DEBUG` = false
- `SECRET_KEY` = (auto-generate or set custom value)

### Monitoring Logs

View real-time logs in Render Dashboard → Logs tab

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | Check Render logs for errors |
| Build fails | Ensure requirements.txt is complete |
| PDF generation fails | Check WeasyPrint dependencies |
| Slow responses | Free tier may be slow; upgrade plan or increase workers |

## Security

- Secrets stored in environment variables (not in code)
- `.env` file excluded from Git
- Debug mode disabled in production by default
- No hardcoded credentials

## Future Enhancements

- Database for storing invoices
- User authentication
- Invoice templates customization
- Email delivery
- Admin dashboard

## Support

For issues or deployment questions:
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for detailed Render setup
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for scalability patterns
- See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for commands
