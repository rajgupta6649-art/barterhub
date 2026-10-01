# Auto-Deploy Setup for BarterHub on Render.com

This guide will help you set up automatic deployment so that when you push changes to GitHub, your BarterHub app will automatically deploy.

---

## ✅ Current Status

- **Frontend**: Already deployed at `https://shubham6853.github.io/BarterHub/` ✅
- **Backend**: `https://barterhub-g3vp.onrender.com` ✅
- **API URL**: Configured in `api.js` ✅

---

## 🔄 How Auto-Deploy Works

1. Make code changes
2. `git push origin main`
3. Render auto-detects & redeploys (1-2 mins)

---

## 🔧 Environment Variables (Render Dashboard → Environment)

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGODB_URI` | [Your MongoDB Atlas URI - KEEP PRIVATE] |
| `JWT_SECRET` | [Random secure string] |

**MongoDB Setup:**
1. https://www.mongodb.com/atlas → Free cluster
2. Create DB user → Copy connection string (private!)
3. Network Access → Allow all IPs (0.0.0.0/0)

---

## 🚀 Deploy Steps

```bash
git add .
git commit -m "Update"
git push origin main
```

---

## 📁 Key Files
- `render.yaml` - Render config
- `backend/server.js` - Uses env vars
- `api.js` - Production API URL

