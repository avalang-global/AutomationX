import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import { createAction, Property } from '@activepieces/pieces-framework';
import { baseUrl, tiktokAuth } from '../common';

export const postPhotos = createAction({
  name: 'post_photos',
  displayName: 'Post Photos',
  description: 'Post photos to TikTok',
  props: {
    title: Property.ShortText({
      displayName: 'Title',
      description: 'Title of the post',
      required: true,
    }),
    description: Property.LongText({
      displayName: 'Description',
      description: 'Description or caption of the post',
      required: true,
    }),
    disableComment: Property.Checkbox({
      displayName: 'Disable Comments',
      description: 'Should comments be disabled on this post?',
      required: false,
    }),
    privacyLevel: Property.StaticDropdown({
      displayName: 'Privacy Level',
      description: 'Privacy level of the post',
      required: true,
      options: {
        options: [
          { label: 'Public to Everyone', value: 'PUBLIC_TO_EVERYONE' },
          { label: 'Private', value: 'PRIVATE' },
          { label: 'Friends Only', value: 'FRIENDS' },
        ],
      },
    }),
    autoAddMusic: Property.Checkbox({
      displayName: 'Auto Add Music',
      description: 'Automatically add music to the post',
      required: false,
    }),
    photoCoverIndex: Property.Number({
      displayName: 'Photo Cover Index',
      description: 'Index of the photo to use as cover (1-based)',
      required: false,
    }),
    photoImages: Property.Array({
      displayName: 'Photo URLs',
      description: 'Array of photo URLs to post',
      required: true,
    }),
    postMode: Property.StaticDropdown({
      displayName: 'Post Mode',
      description: 'How to post the content',
      required: true,
      options: {
        options: [
          { label: 'Direct Post', value: 'DIRECT_POST' },
          { label: 'Draft', value: 'DRAFT' },
          { label: 'Schedule', value: 'SCHEDULE' },
        ],
      },
    }),
  },
  auth: tiktokAuth,
  async run(context) {
    const {
      title,
      description,
      disableComment,
      privacyLevel,
      autoAddMusic,
      photoCoverIndex,
      photoImages,
      postMode,
    } = context.propsValue;

    const res = await httpClient.sendRequest({
      method: HttpMethod.POST,
      url: `${baseUrl}/post/publish/content/init/`,
      headers: {
        Authorization: `Bearer ${context.auth.access_token}`,
        'Content-Type': 'application/json',
      },
      body: {
        post_info: {
          title: title,
          description: description,
          disable_comment: disableComment ?? false,
          privacy_level: privacyLevel,
          auto_add_music: autoAddMusic ?? false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          photo_cover_index: photoCoverIndex ?? 1,
          photo_images: photoImages,
        },
        post_mode: postMode,
        media_type: 'PHOTO',
      },
    });
    return res.body;
  },
});
