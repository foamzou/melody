let request;

let isInstallable = false;

// The file is not useful now.
window.addEventListener('beforeinstallprompt', (r) => {
    console.log('beforeinstallprompt')
	// Prevent Chrome 67 and earlier from automatically showing the prompt
	r.preventDefault()
	request = r
	isInstallable = true;
});

export async function installPWA() {
    if (request) {
        console.log('start install')
        let installResponse = await request.prompt();
        console.info({installResponse});
        return installResponse.outcome === 'accepted';
    } else {
        console.log('The request is not available');
        return false;
    }
}