# Deploy Google Apps Script for GAMGEE Forms

## Steps

1. Go to **https://script.google.com**
2. Click **New Project**
3. Delete the default `myFunction` code
4. Copy everything from `Code.gs` and paste it in
5. Click **Save** (Ctrl+S)
6. Click **Deploy** > **New deployment**
7. Settings:
   - **Type:** Web app
   - **Execute as:** Me (septyo@gamgee.io)
   - **Who has access:** Anyone
8. Click **Deploy**
9. **Copy the Web app URL** (looks like `https://script.google.com/macros/s/AKfycbx.../exec`)

## After deploying

Replace `YOUR_SCRIPT_URL` in the HTML files with the actual URL:

- `gamgee-io/index.html` — line ~1084
- `gamgee-io/apply/index.html` — line ~777

Then commit and push:
```
git add -A
git commit -m "Connect forms to Google Apps Script"
git push origin main
```

## Notes

- The script writes directly to the Google Sheet (same sheet as the backend)
- No duplicate detection — every submission goes through
- If you need to update the script later, edit at script.google.com and deploy again (New deployment)
