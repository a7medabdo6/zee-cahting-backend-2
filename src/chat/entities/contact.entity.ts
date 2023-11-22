import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PrivateMessage } from './private-message.entity';
import { Type } from 'class-transformer';
import { User } from 'src/user/entities/user.entity';

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
export class Contact extends Document {

    @Prop({ type: Types.ObjectId, ref: 'User' })
    @Type(() => User)
    owner: User;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    @Type(() => User)
    user: User;

    @Prop({ type: Types.ObjectId, ref: 'PrivateMessage' })
    @Type(() => PrivateMessage)
    lastMessage?: PrivateMessage;

    @Prop()
    unSeenCount?: number;

    @Prop()
    isOnline?: boolean; 
    
    @Prop()
    isBlock?: boolean;

    @Prop()
    lastSeen?: Date;
}


export const ContactSchema = SchemaFactory.createForClass(Contact);
