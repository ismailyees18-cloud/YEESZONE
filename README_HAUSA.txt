YEESZONE — Shop. Sell. Discover.

ABIN DA KE CIKIN WANNAN ZIP
- index.html: shafin farko da marketplace
- styles.css: tsarin launuka da bayyanar shafi
- app.js: signup/login da karanta listings daga Supabase
- config.example.js: misalin wurin saka Supabase URL da Publishable/anon key

MUHIMMI KAFIN A YI AMFANI
1. Wannan starter ne na farko, ba cikakken shafin kasuwanci da aka gama ba.
2. Buɗe config.js da text editor, sannan saka Project URL da Publishable/anon key naka a wuraren da aka nuna.
4. Kada ka saka sb_secret_... ko service_role key a config.js ko GitHub. Idan an fallasa secret key, a soke/juya shi daga Supabase.
5. A Supabase, tabbatar Row Level Security (RLS) da policies sun dace kafin a nuna bayanan masu amfani.
6. An haɗa login/signup da karanta listings kawai. Ba a kunna ƙirƙirar listings, oda, biyan kuɗi ko admin actions ba tukuna.
7. Kada a karɓi kuɗin gaske ko a yi amfani da wannan a matsayin production store har sai an gwada permissions, orders, storage da payment processing sosai.

YADDA ZA A BUƊE A GITHUB TA ANDROID
1. Ajiye ZIP a wayarka sannan ka yi Extract/Unzip ta Files app.
2. A GitHub repository YEESZONE, danna Add file > Upload files.
3. Zaɓi fayilolin da ke cikin folder YEESZONE_STARTER bayan an cire ZIP. Ka ɗora index.html, styles.css, app.js, config.js da README_HAUSA.txt. (Za ka iya barin config.example.js.)
4. Kada ka ɗora secret key. Kada ka manta: GitHub Upload Files ba ya buɗe ZIP ya cire shi kai tsaye; sai an Extract da farko.

KAFIN A CI GABA
Za a buƙaci a duba ainihin SQL schema da RLS policies da ke cikin Supabase domin a rubuta amintaccen seller/admin workflow. Kada a ɗauka cewa admin page yana da kariya saboda an ɓoye shi a browser.
