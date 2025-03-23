import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    ParentID: { type: String, required: false },
    DisplayPicture: { type: String, required: true },
    NameOfPoster: { type: String, required: true },
    Verified: { type: Boolean, default: false },
    TimeOfPost: { type: String, required: true },
    Visibility: { type: String, required: true },
    Caption: { type: String, required: true },
    Image: { type: [String], required: true },  // Array of strings for image URLs
    NoOfLikes: { type: Number, default: 0 },
    Liked: { type: Boolean, default: false },
    NoOfComment: { type: Number, default: 0 },
    NoOfShares: { type: Number, default: 0 },
    NoOfBookmarks: { type: Number, default: 0 },
    Bookmarked: { type: Boolean, default: false },
    Username: { type: String, required: true },
    PostID: { type: String, required: true },
    Code: { type: String, required: true },
    WhoCanComment: { type: String, required: true },
    Type: { type: String, required: true}
}, { timestamps: true, collection: 'PostCard' });

const Post = mongoose.model('Post', postSchema);

export default Post;