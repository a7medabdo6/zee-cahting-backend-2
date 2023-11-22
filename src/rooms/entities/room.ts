import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Type } from "class-transformer";
import { Document, Types } from "mongoose";
import { User } from "src/user/entities/user.entity";

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
export class Room extends Document {

    @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
    @Type(() => User)
    creator: User;

    @Prop({ required: true, unique: true })
    name: string;

    @Prop({ default: null })
    picture?: string;

    @Prop({ default: false })
    membersOnly: boolean;

    @Prop({ default: null })
    password?: string;

    @Prop({ type: [Types.ObjectId], ref: 'User' })
    @Type(() => Array<User>)
    members: User[];

    @Prop({ type: [Types.ObjectId], ref: 'User' })
    @Type(() => Array<User>)
    owners: User[];

    @Prop({ type: [Types.ObjectId], ref: 'User' })
    @Type(() => Array<User>)
    admins: User[];

    @Prop({ type: [Types.ObjectId], ref: 'User' })
    @Type(() => Array<User>)
    banned: User[];

    @Prop({ type: Object })
    online: Object;

    @Prop()
    isFavorite?: boolean;

    @Prop()
    message?: string;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    @Type(() => User)
    messageOwner?: User;
}

export const RoomSchema = SchemaFactory.createForClass(Room);