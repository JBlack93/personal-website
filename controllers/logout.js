module.exports = (req, res) => {
    req.logout();
    req.session.destroy(() => {
	res.clearCookie('connect.sid');
	// Don't redirect, just print tex
	res.send('Logged out');
        // res.redirect('/')
    })
}
