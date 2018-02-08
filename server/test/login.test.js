const app = require('../app'),
  chai = require('chai'),
  chaiHttp = require('chai-http'),
  should = chai.should(),
  {resetAllCollections, users} = require('../seed'),
  errors = require('../errors.json'),
  jwt = require('jsonwebtoken'),
  JWT_SECRET = process.env.JWT_SECRET

chai.use(chaiHttp)

before('Pre-test DB reset', resetAllCollections)
const user = users[0]

describe('Sign-up route in API', () => {
  const path = '/signup'

  it(`should register and respond with
        status 200,
        body (_id, publicName, userpic, boards)
        authToken in 'x-auth' header`, done => {
    chai.request(app).post(path)
      .send(user)
      .end((err, res) => {
        res.should.have.status(200)
        res.body.should.be.a('object')
        res.body.should.have.all
          .keys('_id', 'publicName', 'boards', 'userpic')
        res.body.publicName.should.be.eql(user.publicName)
        res.body.userpic.should.be.eql(user.userpic)
        res.body.boards.should.be.eql([])
        res.should.have.header('x-auth')
        jwt.decode(res.headers['x-auth'])._id
          .should.be.eql(res.body._id)
        done()
      })
  })

  it('should not register user with existing login', done => {
    chai.request(app).post(path)
      .send(user)
      .end((err, res) => {
        res.should.have.status(400)
        res.body.should.be.a('object')
        res.body.should.be.eql(errors.loginRegistered)
        done()
      })
  })

  it('should not register user without login', done => {
    chai.request(app).post(path)
      .send({password: 'some-legit-password'})
      .end((err, res) => {
        res.should.have.status(400)
        res.body.should.be.a('object')
        res.body.should.be.eql(errors.loginRequired)
        done()
      })
  })

  xit('should not register user with invalid login')

  it('should not register user without password', done => {
    chai.request(app).post(path)
      .send({login: 'some-legit-login'})
      .end((err, res) => {
        res.should.have.status(400)
        res.body.should.be.a('object')
        res.body.should.be.eql(errors.passwordRequired)
        done()
      })
  })

  xit('should not register user with invalid password')
})

describe('Login route in API', () => {
  const path = '/login'
  let token = ''

  it(`should login by credentials (login & password) and respond with
        status 200,
        body (_id, publicName, userpic, boards)
        authToken in 'x-auth' header`, done => {
    chai.request(app).post(path)
      .send(user)
      .end((err, res) => {
        res.should.have.status(200)
        res.body.should.be.a('object')
        res.body.should.have.all
          .keys('_id', 'publicName', 'boards', 'userpic')
        res.should.have.header('x-auth')
        token = res.headers['x-auth']
        jwt.decode(res.headers['x-auth'])._id
          .should.be.eql(res.body._id)
        done()
      })
  })

  it('should respond 403 to empty request', done => {
    chai.request(app).post(path)
      .send({})
      .end((err, res) => {
        res.should.have.status(403)
        res.body.should.be.a('object')
        res.body.should.be.eql(errors.accessDenied)
        done()
      })
  })

  it('should respond 403 to wrong login', done => {
    chai.request(app).post(path)
      .send({
        login: 'some-non-existing-login',
        password: 'password'
      })
      .end((err, res) => {
        res.should.have.status(403)
        res.body.should.be.a('object')
        res.body.should.be.eql(errors.wrongCredentials)
        done()
      })
  })

  it('should respond 403 to empty login', done => {
    chai.request(app).post(path)
      .send({
        login: '',
        password: 'password'
      })
      .end((err, res) => {
        res.should.have.status(403)
        res.body.should.be.a('object')
        res.body.should.be.eql(errors.accessDenied)
        done()
      })
  })

  it('should respond 403 to wrong password', done => {
    chai.request(app).post(path)
      .send({
        login: user.login,
        password: 'some-wrong-password'
      })
      .end((err, res) => {
        res.should.have.status(403)
        res.body.should.be.a('object')
        res.body.should.be.eql(errors.wrongCredentials)
        done()
      })
  })

  it('should respond 403 to empty password', done => {
    chai.request(app).post(path)
      .send({
        login: 'some-login',
        password: ''
      })
      .end((err, res) => {
        res.should.have.status(403)
        res.body.should.be.a('object')
        res.body.should.be.eql(errors.accessDenied)
        done()
      })
  })

  it(`should login by authToken and respond with
        status 200,
        body (_id, publicName, userpic, boards)`, done => {
    chai.request(app).post(path)
      .send({})
      .set('x-auth', token)
      .end((err, res) => {
        res.should.have.status(200)
        res.body.should.be.a('object')
        res.body.should.have.all
          .keys('_id', 'publicName', 'boards', 'userpic')
        jwt.decode(token)._id
          .should.be.eql(res.body._id)
        done()
      })
  })

  it('should respond 403 to a bad authToken', done => {
    const badToken = jwt.sign({
      _id: 'mumbo-jumbo',
      access: 'blah'
    }, 'manah-manah').toString()
    chai.request(app).post(path)
      .send({})
      .set('x-auth', badToken)
      .end((err, res) => {
        res.should.have.status(403)
        res.body.should.be.a('object')
        res.body.should.be.eql(errors.badToken)
        done()
      })
  })

  it('should respond 403 to a token with invalid signature', done => {
    const payload = jwt.decode(token)
    const badToken = jwt.sign(payload, 'wrong secret').toString()
    chai.request(app).post(path)
      .send({})
      .set('x-auth', badToken)
      .end((err, res) => {
        res.should.have.status(403)
        res.body.should.be.a('object')
        res.body.should.be.eql(errors.badToken)
        done()
      })
  })

  it('should respond 403 to a token with wrong _id', done => {
    const payload = jwt.decode(token)
    let wrongId = payload._id.toString()
    wrongId = wrongId.substr(0, wrongId.length - 1 )
      + (parseInt(wrongId.substr(-1), 16) + 1).toString(16)
    payload._id = wrongId
    const badToken = jwt.sign(payload, JWT_SECRET).toString()
    chai.request(app).post(path)
      .send({})
      .set('x-auth', badToken)
      .end((err, res) => {
        res.should.have.status(403)
        res.body.should.be.a('object')
        res.body.should.be.eql(errors.badToken)
        done()
      })
  })

  it('should respond 403 to a token with wrong `iat`', done => {
    const payload = jwt.decode(token)
    payload.iat = Math.floor(new Date().getTime() / 1000) + 8
    const badToken = jwt.sign(payload, JWT_SECRET).toString()
    chai.request(app).post(path)
      .send({})
      .set('x-auth', badToken)
      .end((err, res) => {
        res.should.have.status(403)
        res.body.should.be.a('object')
        res.body.should.be.eql(errors.badToken)
        done()
      })
  })

  xit('should respond 403 to an expired token')
})
