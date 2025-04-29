<>
  <button 
    type="submit"
    className="auth-button login-button"
    disabled={loading}
  >
    {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
  </button>
  
  <div className="divider">
    <span>ya da</span>
  </div>
  
  <button 
    type="button"
    className="auth-button google-button"
    onClick={handleGoogleLogin}
    disabled={loading}
  >
    <img src={googleLogo} alt="Google" className="google-icon" />
    <span>Google ile giriş yap</span>
  </button>
</> 