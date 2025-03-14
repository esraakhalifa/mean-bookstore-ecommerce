export class UsersManager {
  constructor() {
    this.usersData = new Map();
  }

  addUser(userId) {
    if (!this.usersData.has(userId)) {
      this.usersData.set(userId, {
        sockets: new Map(),
        history: []
      });
    }
  }

  addSocket(userId, socketId, metadata) {
    const userData = this.usersData.get(userId);
    if (userData) {
      userData.sockets.set(socketId, metadata);
    }
  }

  removeSocket(userId, socketId) {
    const userData = this.usersData.get(userId);
    if (userData) {
      userData.sockets.delete(socketId);
    }
  }

  addHistory(userId, historyEntry) {
    const userData = this.usersData.get(userId);
    if (userData) {
      userData.history.push(historyEntry);
    }
  }

  getSocketCount(userId) {
    const userData = this.usersData.get(userId);
    return userData ? userData.sockets.size : 0;
  }

  getUserData(userId) {
    return this.usersData.get(userId);
  }
}
