import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({
    versionKey: false,
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            delete ret._id;
            delete ret.updatedAt;
        },
    },
    toObject: {
        virtuals: true,
        transform(doc, ret) {
            doc.id = ret._id;
        },
    },
})
export class Friend extends Document {

    @Prop({ required: true })
    ownerId: string;

    @Prop({ required: true })
    userId: string;

    @Prop({ default: false })
    isAccepted: boolean;

    @Prop({type : Object})
    user: Object;
}

export const FriendSchema = SchemaFactory.createForClass(Friend);