function createJSON(params, values)
{
    let json = {};
    for (let i = 0; i < params.length; i++)
    {
        json[params[i]] = values[i];
    }
    return json;
}

function promisingAjaxCall(url, method, data, contentType)
{
    return new Promise((resolve, reject) =>
    {
        $.ajax({
            url: url,
            method: method,
            contentType: contentType || "application/json",
            data: JSON.stringify(data),
            success: function(response)
            {
                resolve(response);
            },
            error: function(xhr, status, error)
            {
                reject(xhr.responseJSON || error);
            }
        });
    });
}

function logout()
{
	localStorage.removeItem('user_id');
	localStorage.removeItem('institute_id');
	localStorage.removeItem('user_type_id');
	localStorage.removeItem('academic_year_id');
	localStorage.removeItem('admin-username-saved');
	window.location.href = 'admin.html';
}