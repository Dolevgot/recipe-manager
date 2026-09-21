# המתכונים שלי

אפליקציית ווב אישית לניהול מתכונים, בעברית ובכיוון RTL, מותאמת לטלפון.
הקוד יושב ב-GitHub, האתר מתפרסם ב-GitHub Pages, ובסיס הנתונים הוא **גיליון Google** בחשבון שלך. אין שרת.

## איך זה עובד ומה מוגן

- האתר עצמו ציבורי, **הנתונים לא**. כל פנייה ל-Google נעשית עם ההרשאה של המשתמש המחובר,
  ולכן רק מי שהגיליון משותף איתו יכול לקרוא ולכתוב.
- ה-Client ID וה-Sheet ID אינם סודות. הם מוזרקים בזמן הבנייה (`VITE_GOOGLE_CLIENT_ID`, `VITE_SHEET_ID`).
- הקובץ `.env.local` לא נכנס ל-git. אף מתכון לא נשמר בריפו.
- ה-access token נשמר בזיכרון בלבד. רענון הדף = התחברות מחדש.

## מבנה הקוד

| קובץ | תפקיד |
|---|---|
| `src/auth.js` | התחברות עם Google, token בזיכרון, זיהוי פקיעת תוקף |
| `src/sheets.js` | קריאה וכתיבה לגיליון, יצירת הלשוניות בהרצה ראשונה |
| `src/docs.js`, `src/parseDoc.js` | ייבוא מגוגל דוקס (הפרסר הוא פונקציה טהורה עם בדיקות) |
| `src/text.js` | נרמול עברית וחיפוש |
| `src/App.jsx` + שאר קבצי `.jsx` | המסכים |

## הגדרה חד-פעמית

1. **Google Cloud:** צור פרויקט ב-https://console.cloud.google.com והפעל **Google Sheets API** ו-**Google Docs API**.
2. **מסך הסכמה (OAuth consent):** סוג External, מצב Testing. הוסף את כתובות ה-Gmail שלך ושל בני המשפחה ל-**Test users**.
   האזהרה "Google hasn't verified this app" צפויה: לחץ Advanced ואז Go to ... (unsafe). בהסכמה סמן את **כל** ההרשאות.
3. **Client ID:** Credentials, Create, OAuth client ID, Web application. ב-Authorized JavaScript origins הוסף
   `http://localhost:5173` ואת `https://<שם-המשתמש-שלך>.github.io` (בלי נתיב ובלי `/` בסוף).
4. **גיליון:** צור גיליון ריק. ה-ID הוא החלק שבין `/d/` ל-`/edit` בכתובת.

## הרצה מקומית

```bash
npm install
cp .env.example .env.local   # ומלא את שני הערכים
npm run dev
```

פתח http://localhost:5173/recipe-manager/. בהתחברות הראשונה האפליקציה יוצרת בגיליון את הלשוניות
`Recipes` ו-`Categories`. את רשימת הקטגוריות אפשר לערוך ישירות בגיליון.

בדיקות ובנייה: `npm test` ו-`npm run build`.

## פרסום

1. צור ריפו **ציבורי** בשם `recipe-manager` (GitHub Pages בחשבון חינמי דורש ריפו ציבורי).
2. ב-Settings, Secrets and variables, Actions, לשונית **Variables**, הוסף `VITE_GOOGLE_CLIENT_ID` ו-`VITE_SHEET_ID`.
3. ב-Settings, Pages, Source: **GitHub Actions**.
4. `git push` ל-`main`. ה-workflow ב-`.github/workflows/deploy.yml` מריץ בדיקות, בונה ומפרסם.

הכתובת: `https://<שם-המשתמש>.github.io/recipe-manager/`

## ייבוא ממסמך Google Docs

בתפריט העליון: **ייבוא מגוגל דוקס**. הדבק קישור או ID, אשר את הרשאת הקריאה למסמכים,
תקן קטגוריות בטבלת התצוגה המקדימה ולחץ ייבוא. שמות שכבר קיימים בגיליון מדולגים.

## הוספת בן משפחה

1. שתף איתו את הגיליון (Share, Editor).
2. הוסף את ה-Gmail שלו ל-**Test users** במסך ההסכמה ב-Google Cloud.
3. שלח לו את קישור האתר.

## פתרון בעיות

- **`origin_mismatch` / `redirect_uri_mismatch`:** הכתובת שממנה נטען האתר לא מופיעה ב-Authorized JavaScript origins.
  בדוק כתובת מדויקת (בלי `/` בסוף, https באתר, http ב-localhost). לפעמים לוקח כמה דקות עד ש-Google מעדכן.
- **"אין לך גישה לגיליון" (403):** ההתחברות היא עם חשבון שאין לו גישה לגיליון, או שלא סימנת את כל ההרשאות
  במסך ההסכמה, או ש-Sheets API לא מופעל בפרויקט. התנתק והתחבר שוב. הודעת השגיאה המלאה מודפסת ב-Console.
- **"הגיליון לא נמצא" (404):** ה-`VITE_SHEET_ID` שגוי.
- **"פג תוקף ההתחברות":** ה-token תקף כשעה. לחץ **התחבר מחדש**. מה שהקלדת בטופס נשמר.
- **`access_denied` בהתחברות:** ה-Gmail לא ברשימת Test users.
- **אחרי שינוי משתני סביבה ב-GitHub:** הרץ מחדש את ה-workflow (Actions, Run workflow), כי הערכים נכנסים בזמן הבנייה.
- **מתכון שנמחק בטעות:** בגיליון, בעמודה `deleted`, מחק את הערך `TRUE`.
- במצב Testing, Google עשוי לבקש התחברות מחדש אחרי 7 ימים.
