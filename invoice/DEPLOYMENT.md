# Deployment Guide - Render.com

## Prerequisites

1. GitHub account with your repository pushed
2. Render.com account (free tier available)
3. All code committed and pushed to main branch

## Step-by-Step Deployment

### 1. Create a Render.com Account

Visit [https://render.com](https://render.com) and sign up with your GitHub account.

### 2. Connect GitHub Repository

- Log in to Render Dashboard
- Click "New" → "Web Service"
- Select "Build and deploy from a Git repository"
- Connect your GitHub account
- Select your invoice repository

### 3. Configure the Web Service

Fill in the configuration form:

| Field             | Value                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------- |
| **Name**          | `invoice-app` (or your preferred name)                                                   |
| **Environment**   | `Python 3`                                                                               |
| **Region**        | Choose closest to your users                                                             |
| **Branch**        | `main` (or your deployment branch)                                                       |
| **Build Command** | `pip install -r requirements.txt`                                                        |
| **Start Command** | `gunicorn app:app --workers 3 --bind 0.0.0.0:$PORT --access-logfile - --error-logfile -` |

### 4. Set Environment Variables

Click "Add Environment Variable" and add:

```
FLASK_ENV = production
DEBUG = false
SECRET_KEY = [Generate a random string or let Render auto-generate]
```

For `SECRET_KEY`, you can:

- Click the key icon to auto-generate
- Or use: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

### 5. Deploy

- Click "Create Web Service"
- Render will automatically start building and deploying
- Watch the build log for any errors
- Once deployed, you'll get a URL like `https://invoice-app-xxxxx.onrender.com`

## Using render.yaml (Alternative)

If your repository has `render.yaml`, you can:

1. In Render Dashboard → "New +" → "Infrastructure"
2. Upload or paste the `render.yaml` file
3. Render will auto-configure the service

## Verifying Deployment

1. Visit your Render URL: `https://invoice-app-xxxxx.onrender.com`
2. Check the form loads correctly
3. Generate a test invoice
4. Review logs in Render Dashboard → Logs tab

## Logs & Monitoring

Access logs in Render Dashboard:

- Click your service name
- Go to "Logs" tab
- Real-time logs of all requests and errors
- Errors appear with full stack traces

## Making Updates

After pushing code changes to GitHub:

1. Render automatically redeploys (if auto-deploy is enabled)
2. Monitor the "Events" tab for deployment status
3. New logs appear as requests come in

## Troubleshooting

### 502 Bad Gateway

- Check the Logs for errors
- Ensure `requirements.txt` has all dependencies
- Verify `app.py` exists and is correct

### Build Fails

- Check Python version requirements
- Ensure all dependencies are in `requirements.txt`
- Look for syntax errors in app.py

### Slow Response Times

- Free tier on Render may be slow
- Consider upgrading to Paid tier
- Increase workers if needed: `--workers 5`

### PDF Generation Fails

- WeasyPrint requires system libraries
- These should be included by Render's Python environment
- Check logs for specific error messages

## Performance Tuning

For higher traffic, modify the start command:

- Increase workers: `--workers 5` (for more CPU)
- Adjust timeouts: `--timeout 60` (for long PDF generation)

Example:

```bash
gunicorn app:app --workers 5 --bind 0.0.0.0:$PORT --timeout 60 --access-logfile - --error-logfile -
```

## Custom Domain

To add a custom domain:

1. In your Render service settings
2. Add a custom domain
3. Configure DNS records as instructed

## Backup & Maintenance

Since this is a stateless application:

- No database backups needed
- Redeploy anytime from code
- PDF outputs aren't stored on server (generated on-demand)

## Cost Considerations

Render.com Free Tier:

- 1 web service included
- 750 hours/month (enough for ~1 service)
- Spins down after 15 minutes of inactivity
- Use Paid plan if you need always-on service

## Support

For Render-specific issues:

- Check Render documentation: https://render.com/docs
- Review service logs
- Contact Render support

For application issues:

- Check Flask logs locally: `DEBUG=true python app.py`
- Review error messages in Render logs
