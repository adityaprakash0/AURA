import mongoose from 'mongoose';


const stockSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    stockname: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity cannot be less than 1']
    },
    buy_price: {
        type: Number,
        required: true
    },
    current_price: {
        type: Number,
        default: 0
    }
}, { 
    timestamps: true,
    // CRITICAL: Virtuals aren't included in JSON/Object output by default
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// FIXED: Matching the field names defined above
stockSchema.virtual('profitLoss').get(function() {
    return (this.current_price - this.buy_price) * this.quantity;
});

export default mongoose.model('Stock', stockSchema);