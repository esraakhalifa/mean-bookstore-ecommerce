import mongoose from 'mongoose';

/** 
 *                                                         Books

PK                                     book id: ObjectId

                                title: string required

  author: string required

  price: number required

  description: string required

  stock: number required

  reviews: Array

  image: string required

Remember the current location is Giza, Giza Governorate, Egypt.
*/
const BookSchema = new mongoose.Schema(
    {

        title:{
            type: String,
            required:true,
            unique: true
        },
        authors: {
            type: [String], // Array of strings
            validate: {
              validator: function (arr) {
                return arr.length > 0; // Ensures at least 3 books
              },
              message: "A book must have at least one author"
            }
          }
        ,price:{
            type:Number,
            required:true,
            min: 1,
        }
        ,description:{
            type:String,
            required:true,
        }
        ,stock:{
            type: Number,
            required:true,
            min:0,
            default: 0,
            validate: {
                validator: Number.isInteger,
                message: "Stock must be an integer."
              }
        }
        ,reviews:[{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Review',
        }]
        ,img:{
            type:String,
            required:true,

        }
    }
);

const Books = mongoose.model('Book', BookSchema);

export default Books;