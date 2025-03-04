import mongoose from 'mongoose';
import AutoIncrement from 'mongoose-sequence';
const connection = mongoose.connection;
/**
 * Orders

PK  ord_id ObjectID

FK  user_ref_id: ObjectID

Books: Array

totalPrice: Number

createdAT: Date / Timestamp

Payment Method
 */
const OrderSchema = mongoose.Schema(
    {
        _id:{
            type:Number
        },
        user:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true
        },
        books:
        [{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Book',
            required:true,
            validate:{
                validator: function(arr)
                {
                    return arr.length >0;
                },
                message: "User should at least order 1 book."
            }
        }],
        total_price:
        {
            type:Number,
            required:true,
            min:1
        },
        payment_method:{
            type:String,
            required:true,
            enum: ["card", "cash", "online wallet"],
        }

    },
    {timestamps:true}
);

OrderSchema.plugin(AutoIncrement(connection), {inc_field: '_id'});