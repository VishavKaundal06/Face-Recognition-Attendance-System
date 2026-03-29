const mongoose = require('mongoose');

// In-memory data stores
const store = {
    students: [],
    attendance: [],
    users: [],
    audit: [],
    analytics: []
};

/**
 * Mock Mongoose Model Factory
 */
function createMockModel(name, dataKey) {
    const data = store[dataKey];

    // The Constructor
    function MockModelInstance(doc) {
        this._id = new mongoose.Types.ObjectId();
        Object.assign(this, doc);
        this.createdAt = new Date();
        this.updatedAt = new Date();
        if (this.isActive === undefined) this.isActive = true;

        this.save = async function() {
            const index = data.findIndex(i => String(i._id) === String(this._id));
            if (index === -1) {
                data.push(this);
            } else {
                data[index] = this;
            }
            this.updatedAt = new Date();
            return this;
        };

        this.toObject = function() { return { ...this }; };
        this.toJSON = function() { return { ...this }; };
    }

    // Static Methods
    MockModelInstance.modelName = name;
    
    MockModelInstance.find = function(query = {}) {
        let results = data.filter(item => {
            for (let key in query) {
                if (query[key] && typeof query[key] === 'object') {
                    if (query[key].$ne !== undefined && item[key] === query[key].$ne) return false;
                    if (query[key].$exists !== undefined) {
                        const exists = item[key] !== undefined && item[key] !== null && (!Array.isArray(item[key]) || item[key].length > 0);
                        if (exists !== query[key].$exists) return false;
                    }
                } else if (item[key] !== query[key]) {
                    return false;
                }
            }
            return true;
        });

        const chain = {
            select: () => chain,
            sort: () => chain,
            limit: () => chain,
            populate: () => chain,
            exec: async () => results,
            then: (callback) => Promise.resolve(results).then(callback),
            catch: (callback) => Promise.resolve(results).catch(callback)
        };
        return chain;
    };

    MockModelInstance.findOne = async function(query = {}) {
        const results = await this.find(query).exec();
        return results.length > 0 ? results[0] : null;
    };

    MockModelInstance.findById = async function(id) {
        return this.findOne({ _id: id });
    };

    MockModelInstance.findByIdAndUpdate = async function(id, update, options = {}) {
        const item = await this.findById(id);
        if (!item) return null;
        Object.assign(item, update);
        item.updatedAt = new Date();
        return item;
    };

    MockModelInstance.create = async function(doc) {
        const instance = new MockModelInstance(doc);
        await instance.save();
        return instance;
    };

    MockModelInstance.countDocuments = async function(query = {}) {
        const results = await this.find(query).exec();
        return results.length;
    };

    return MockModelInstance;
}

const MockStudent = createMockModel('Student', 'students');
const MockAttendance = createMockModel('Attendance', 'attendance');

module.exports = {
    MockStudent,
    MockAttendance,
    store
};
