// Public, non-secret configuration. The MyFatoorah API key is NOT here:
// it is stored on the server and entered from the dashboard (admin.html).
window.ZENVO = {
  SUPABASE_URL: "https://dfemxyndnzafofcirsgo.supabase.co",
  SUPABASE_KEY: "sb_publishable_NZKnqSgHeRsXIOHKy5pMXQ_xDaIw5SZ",
  MF_SCRIPT: {
    test: "https://demo.myfatoorah.com/sessions/v1/session.js",
    // Jordan, Kuwait, Bahrain and Oman accounts use the main portal
    live: "https://portal.myfatoorah.com/sessions/v1/session.js"
  }
};
