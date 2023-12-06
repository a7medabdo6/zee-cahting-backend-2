import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { Gender } from "src/common/enums";

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
export class User extends Document {

    @Prop({ default: '' })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop({ required: true, unique: true })
    username: string;

    @Prop()
    country?: string;

    @Prop()
    age?: number;

    @Prop({ default: Gender.notSelected, type: String, enum: Gender })
    gender: Gender;

    @Prop()
    picture: string;

    @Prop()
    fcm: string[];

    @Prop({ default: false })
    isOnline?: boolean;

    @Prop()
    status?: string;

    @Prop()
    isFriend: boolean;

    @Prop()
    isFriendRequestSent: boolean;

    @Prop()
    friendsCount: number;

    @Prop({ default: 0 })
    unseenNewRooms: number;

    @Prop({ default: 0 })
    views: number;

    @Prop({ default: false })
    isBlock: boolean;

    @Prop()
    birthday?: Date;

    @Prop()
    lastSeen?: Date;

    @Prop({ default: false })
    isPrivateLock: boolean;

    @Prop({ default: false })
    isHiddenActivity: boolean;

    @Prop()
    favoriteRooms: string[];

    @Prop()
    activeRooms: string[];

    @Prop()
    color?: number;

    @Prop()
    deviceId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);