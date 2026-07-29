export const handleLogout = () => {
    localStorage.removeItem('auth-storage')
    document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    // Gửi logout signal cho các tab khác
    localStorage.setItem('logout', Date.now().toString());
}
