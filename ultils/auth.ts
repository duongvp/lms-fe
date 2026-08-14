export const handleLogout = () => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('auth-storage')
    // Dọn các key program-context cũ được dùng trước khi Chương trình được
    // quản lý theo phiên đăng nhập trong auth store.
    Object.keys(localStorage)
        .filter((key) => key === 'lms.program-context' || key.startsWith('lms.program-context:'))
        .forEach((key) => localStorage.removeItem(key));
    document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    // Gửi logout signal cho các tab khác
    localStorage.setItem('logout', Date.now().toString());
    window.dispatchEvent(new Event('auth:logout'));
}
