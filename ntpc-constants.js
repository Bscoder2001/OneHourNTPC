let BASE_URL_LIVE = "http://localhost:8000/";

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
