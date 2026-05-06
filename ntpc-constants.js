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

function ntpcIsAuthExemptPage()
{
	var href = (window.location.href || '').toLowerCase();
	var path = (window.location.pathname || '').toLowerCase();
	return href.indexOf('admin.html') !== -1
		|| href.indexOf('create-account.html') !== -1
		|| path.indexOf('chat.html') !== -1
		|| href.indexOf('chat.html') !== -1;
}

if (
	(!INSTITUTE_ID || !USER_TYPE_ID || !USER_ID)
	&& !ntpcIsAuthExemptPage()
)
{
	window.location.href = 'admin.html';
}
