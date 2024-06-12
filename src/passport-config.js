import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';


function initialize(passport, getUserByEmail) {
  const authenticateUser = (req, email, password, done) => {
    var flag;
    if(req.originalUrl.includes("customer"))
    {
        flag = "customer"
    }
    else
    {
        flag = "restaurant"
    }
    getUserByEmail(email, flag, async (user) => {
        if (user == null) {
            return done(null, false, { message: 'No user with that email' })
          }
          try {
            console.log(password, " ", user.password);
            if (await bcrypt.compare(password, user.password)) {
              console.log("Inside T");
              return done(null, user)
            } else {
              console.log("Password incorrect");
              return done(null, false, { message: 'Password incorrect' })
            }
          } catch (e) {
            return done(e)
          }  
    })
  }

  passport.use(new LocalStrategy({ usernameField: 'email', passReqToCallback:true }, authenticateUser))
  passport.serializeUser((user, done) => done(null, user))
  passport.deserializeUser(async (user, done) => {
    await getUserByEmail(user.email, user.type, user => {
        return done(null, user);
    })
  })
}

export default initialize;