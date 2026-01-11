const mongoose = require('mongoose');

const searchPostSchema = new mongoose.Schema({
    postId : {
        type : String,
        requried : true,
        unique : true
    },
    userId : {
        type : String,
        requried : true,
        index : true,
    },
    content : {
        type : String,
        requried : true,
    },
    createdAt : {
        type : Date,
        required : true
    }
},
{timestamps : true }
);

searchPostSchema.index({content : 'text'})
searchPostSchema.index({createdAt : -1})

const Search = mongoose.model('Search',searchPostSchema);

module.exports = Search;