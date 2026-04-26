// Default: Laravel on port 8000 (`php artisan serve`). If the API runs elsewhere, set once in the console, then reload:
// localStorage.setItem('api_base_url', 'https://onehourntpc.page.gd');
var _ntpcApiBase = localStorage.getItem('api_base_url');
var _ntpcApiRaw = (_ntpcApiBase && _ntpcApiBase.trim()) ? _ntpcApiBase.trim() : 'http://localhost:8000';
var BASE_URL_LIVE = _ntpcApiRaw.replace(/\/?$/, '/');

let USER_TYPE_ID_ADMIN = 2;
let USER_TYPE_ID_TEACHER = 3;
let USER_TYPE_ID_STUDENT = 4;

const INSTITUTE_ID = localStorage.getItem('institute_id');
const USER_TYPE_ID = localStorage.getItem('user_type_id');
const USER_ID = localStorage.getItem('user_id');

if (
    (!INSTITUTE_ID || !USER_TYPE_ID || !USER_ID) 
	&& (!window.location.href.endsWith('admin.html')) && !window.location.href.endsWith('create-account.html')
)
{
    window.location.href = 'admin.html';
}
