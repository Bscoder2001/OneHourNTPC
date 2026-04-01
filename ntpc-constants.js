let BASE_URL_LIVE = "http://127.0.0.1:8000/";

let USER_TYPE_ID_ADMIN = 2;
/** Teachers (members under an institution) */
let USER_TYPE_ID_TEACHER = 3;
/** Students */
let USER_TYPE_ID_STUDENT = 4;

function getSessionInstituteId()
{
	try
	{
		const v = localStorage.getItem('ntpc_institute_id');
		return v !== null && v !== '' ? Number(v) : null;
	}
	catch (e)
	{
		return null;
	}
}

/**
 * Returns institute id from localStorage or null. Does not redirect — pages should
 * render and show a sign-in prompt when null so the dashboard always loads.
 */
function requireInstituteSession()
{
	const id = getSessionInstituteId();
	if (id === null || Number.isNaN(id))
	{
		return null;
	}
	return id;
}