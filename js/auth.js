/* ============================================================
   auth.js — client-side auth (demo). Passwords hashed locally.
   NOTE: This is a front-end demo; for production use a real
   backend + server-side auth. No data leaves the browser.
   ============================================================ */
(function (w) {
  const U = w.U;
  const USERS_KEY = 'neofin:users';
  const SESSION_KEY = 'neofin:session';

  async function hash(str) {
    if (w.crypto && w.crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str + '::neofin'));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    // fallback
    let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return String(h);
  }

  const Auth = {
    users() { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; } catch (e) { return {}; } },
    saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); },

    current() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; } },
    setSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); },
    logout() { localStorage.removeItem(SESSION_KEY); },

    async register(name, email, pass) {
      email = email.trim().toLowerCase();
      const users = this.users();
      if (users[email]) throw new Error('Já existe uma conta com este e-mail.');
      if (pass.length < 4) throw new Error('A senha precisa de ao menos 4 caracteres.');
      users[email] = { name: name || email.split('@')[0], email, pass: await hash(pass), created: Date.now() };
      this.saveUsers(users);
      this.setSession({ email, name: users[email].name });
      return users[email];
    },

    async login(email, pass) {
      email = email.trim().toLowerCase();
      const users = this.users();
      const u = users[email];
      if (!u) throw new Error('Conta não encontrada. Crie uma conta.');
      if (u.pass !== (await hash(pass))) throw new Error('Senha incorreta.');
      this.setSession({ email, name: u.name });
      return u;
    },

    demo() {
      const s = { email: 'demo@neofinance.app', name: 'Visitante Demo' };
      this.setSession(s);
      return s;
    },
  };

  w.Auth = Auth;
})(window);
