import mongoose, { Schema } from 'mongoose';
import timestamps from 'mongoose-timestamp';
import mongooseStringQuery from 'mongoose-string-query';
import autopopulate from 'mongoose-autopopulate';

export const FollowSchema = new Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			autopopulate: {
				select: [
					'name',
					'email',
					'username',
					'bio',
					'url',
					'twitter',
					'background',
					'admin',
				],
			},
		},
		followee: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			autopopulate: {
				select: [
					'name',
					'email',
					'username',
					'bio',
					'url',
					'twitter',
					'background',
				],
			},
		},
		podcast: {
			type: Schema.Types.ObjectId,
			ref: 'Podcast',
			autopopulate: {
				select: [
					'url',
					'title',
					'categories',
					'description',
					'image',
					'publicationDate',
					'public',
					'featured',
					'images',
				],
			},
		},
		rss: {
			type: Schema.Types.ObjectId,
			ref: 'RSS',
			autopopulate: {
				select: [
					'url',
					'title',
					'categories',
					'description',
					'favicon',
					'publicationDate',
					'public',
					'featured',
					'images',
				],
			},
		},
		feed: {
			type: String,
			enum: ['rss', 'podcast', 'timeline'],
		},
	},
	{ collection: 'follows' },
);

FollowSchema.plugin(timestamps);
FollowSchema.plugin(mongooseStringQuery);
FollowSchema.plugin(autopopulate);

module.exports = exports = mongoose.model('Follow', FollowSchema);
