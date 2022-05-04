module.exports = class AccountNotExisted extends Error {
  constructor(message) {
    super(message);
    this.name = 'AccountNotExisted';
  }
}