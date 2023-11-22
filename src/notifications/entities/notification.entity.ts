import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { NotificationTypes } from "src/common/enums";
import { User } from "src/user/entities/user.entity";
import { Type } from 'class-transformer';
import { Types, Document } from "mongoose";

@Schema({
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
    versionKey: false,
    timestamps: true,
})
export class Notification extends Document {

    @Prop({ required: true })
    ownerId: string;

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ default: NotificationTypes.unknown, type: String, enum: NotificationTypes })
    type: NotificationTypes;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    @Type(() => User)
    user?: User;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);