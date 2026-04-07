const mongoose = require('mongoose');
const URL = process.env.CONNECTION_STRING;


const connection = () => {
    return new Promise((resolve, reject) => {
        mongoose.connect(URL, {})
            .then(() => {
                return resolve(true)
            })
            .catch(er => {
                return reject(er)
            })
    })
};


module.exports =  connection;