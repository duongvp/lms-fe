export const handleLogout = () => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('auth-storage')
    document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    // Gửi logout signal cho các tab khác
    localStorage.setItem('logout', Date.now().toString());
    window.dispatchEvent(new Event('auth:logout'));
}
