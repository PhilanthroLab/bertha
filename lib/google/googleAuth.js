var GoogleClientLogin = require('googleclientlogin').GoogleClientLogin;


function getAuth( username, password, serviceName ) {
	var auth = new GoogleClientLogin({
		email: username,
		password: password,
		service: serviceName,
		accountType: GoogleClientLogin.accountTypes.google
	});

	return auth;
}

exports.authSpreadsheetAPI = function( username, password, loginCallback, errorCallback ){
	var auth = getAuth( username, password, 'spreadsheets' );

	auth.on(GoogleClientLogin.events.login, loginCallback);

	auth.on(GoogleClientLogin.events.error, function(e) {
		switch(e.message) {
			case GoogleClientLogin.errors.loginFailed:
				if (this.isCaptchaRequired()) {
					console.log('Captcha required');
					//requestCaptchaFromUser(this.getCaptchaUrl(), this.getCaptchaToken());
				} else {
					console.log('Request Again');
					//requestLoginDetailsAgain();
				}
				break;

			case GoogleClientLogin.errors.tokenMissing:
				console.log('GoogleClientLogin.errors.tokenMissing');
				break;

			case GoogleClientLogin.errors.captchaMissing:
				console.log('GoogleClientLogin.errors.captchaMissing');
				break;
		}
		console.log('Unknown Google Auth error');
		errorCallback.apply( this, arguments );
	});

	return auth;
};