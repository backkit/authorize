/**
 * Abstract user permission resolver
 */
class AbstractUserPermission {

  constructor({userId, storageService}) {
    this.userId = userId;
    this.changes = [];
    this.storageService = storageService;
  }

  allow(p) {
    this.changes.push(Object.assign({changeType: 'allow'}, p));
    return this;
  }

  deny(p) {
    this.changes.push(Object.assign({changeType: 'deny'}, p))
    return this;
  }

  async getPermissions(resourceType = null, resourceId = null) {
    throw new Error("not implemented yet");
  }

  async apply() {
    throw new Error("not implemented yet");
  }
}

/**
 * Mongoose backed user permission resolver
 */
class UserPermissionMongoose extends AbstractUserPermission {
  
  constructor({userId, storageService}) {
    super({userId, storageService});

    // init models
    this.mongoose = this.storageService.mongoose;
    this.models = {};
    this.models.UserPermissions = this.mongoose.models.authz_user_permissions || this.mongoose.model('authz_user_permissions', {
      userId: { type: String, index: true },
      resourceType: { type: String, index: true },
      resourceId: { type: String, index: true },
      permissions: { type: Array, index: true },
      groups: { type: Array, index: true }
    });
    this.models.GroupPermissions = this.mongoose.models.authz_group_permissions || this.mongoose.model('authz_group_permissions', {
      groupId: { type: String, index: true },
      resourceType: { type: String, index: true },
      resourceId: { type: String, index: true },
      permissions: { type: Array, index: true },
      users: { type: Array, index: true }
    });
  }

  async getPermissions(resourceType = null, resourceId = null) {
    const selector  = {
      userId: this.userId
    };
    if (resourceType)
      selector.resourceType = resourceType;
    if (resourceId)
      selector.resourceId = resourceId;
    
    try {
      const perms = await (this.models
        .UserPermissions
        .find(selector)
        .exec());
      return perms; 
    } catch (err) {
      return [];
    }
  }

  async apply() {
    for (const ch of this.changes) {
      if (ch.changeType === 'allow') {
        const existing = await this.models.UserPermissions.findOne({
          userId: this.userId,
          resourceType: ch.resourceType,
          resourceId: ch.resourceId
        }).exec();
        if (existing && existing.permissions) {
          const newPermissions = [...new Set([...existing.permissions,...ch.permissions])];
          existing.permissions = newPermissions;
          await existing.save();
        } else {
          await this.models.UserPermissions.create({
            userId: this.userId,
            resourceType: ch.resourceType,
            resourceId: ch.resourceId,
            permissions: ch.permissions
          });
        }
      }
    }
  }
}

/**
 * Authorization service
 */
class Authorize {

  /**
   * Ctor
   *
   * @param {Object} svcs - DI container services
   */
  constructor(svcs) {
    this.config = svcs.config.get('authorize');
    const storageServiceName = this.config.storageService || 'memory';
    switch (storageServiceName) {
      // mongoose storage
      case 'mongoose':
        this.storageService = svcs.mongoose;
        this.UserPermissionClass = UserPermissionMongoose;
        // TODO: this.GroupPermissionClass = GroupPermissionMongoose;
      break;
      default:
        throw new Error(`authorize requires a supported storage service, ${storageService} is not supported`);
      break;
    }
  }

  /**
   * Returns user permission resolver
   *
   * @param {String}
   */
  user(userId) {
    const tx = new this.UserPermissionClass({userId, storageService: this.storageService});
    return tx;
  }

  /**
   * Returns group permission resolver
   *
   * @param {String}
   */
  group(groupId) {
    throw new Error(`not implemented yet`);
    //const tx = new this.GroupPermissionClass({userId, models: this.models});
    //return tx;
  }

  register() {
    return [];
  }
}

module.exports = Authorize;