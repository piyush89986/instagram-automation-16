import mongoose from 'mongoose';

const run = async () => {
    await mongoose.connect("mongodb+srv://user:pass@cluster.mongodb.net/test"); // Just checking syntax, won't execute
}
