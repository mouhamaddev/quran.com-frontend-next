/* eslint-disable max-lines */
import { useCallback, useContext, useMemo, useState } from 'react';

import classNames from 'classnames';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';
import { useDispatch } from 'react-redux';

import styles from '../MediaMaker.module.scss';
import RenderControls from '../RenderControls';

import AlignmentsSettings from './AlignmentsSettings';
import BackgroundVideos from './BackgroundVideos';
import OrientationSettings from './OrientationSettings';
import ReciterSettings from './ReciterSettings';
import TranslationSettingsSection from './TranslationSectionSetting';

import Section from '@/components/Navbar/SettingsDrawer/Section';
import { RangeSelectorType } from '@/components/Verse/AdvancedCopy/SelectorContainer';
import validateRangeSelection from '@/components/Verse/AdvancedCopy/utils/validateRangeSelection';
import VersesRangeSelector from '@/components/Verse/AdvancedCopy/VersesRangeSelector';
import DataContext from '@/contexts/DataContext';
import Button from '@/dls/Button/Button';
import Counter from '@/dls/Counter/Counter';
import Select, { SelectSize } from '@/dls/Forms/Select';
import useRemoveQueryParam from '@/hooks/useRemoveQueryParam';
import layoutStyle from '@/pages/index.module.scss';
import { updateSettings, resetToDefaults } from '@/redux/slices/mediaMaker';
import { MAXIMUM_QURAN_FONT_STEP, MINIMUM_FONT_STEP } from '@/redux/slices/QuranReader/styles';
import MediaSettings, { ChangedSettings } from '@/types/Media/MediaSettings';
import QueryParam from '@/types/QueryParam';
import Reciter from '@/types/Reciter';
import { logButtonClick, logValueChange } from '@/utils/eventLogger';
import { toLocalizedVerseKey } from '@/utils/locale';
import { generateChapterVersesKeys, getChapterNumberFromKey } from '@/utils/verse';

type Props = {
  chaptersList: any[];
  reciters: Reciter[];
  seekToBeginning: () => void;
  getCurrentFrame: () => void;
  isFetching: boolean;
  inputProps: any;
  mediaSettings: MediaSettings;
};

const MEDIA_SETTINGS_TO_QUERY_PARAM = {
  verseTo: QueryParam.VERSE_TO,
  verseFrom: QueryParam.VERSE_FROM,
  shouldHaveBorder: QueryParam.SHOULD_HAVE_BORDER,
  backgroundColorId: QueryParam.BACKGROUND_COLOR_ID,
  opacity: QueryParam.OPACITY,
  reciter: QueryParam.MEDIA_RECITER,
  quranTextFontScale: QueryParam.QURAN_TEXT_FONT_SCALE,
  translationFontScale: QueryParam.TRANSLATION_FONT_SCALE,
  translations: QueryParam.MEDIA_TRANSLATIONS,
  fontColor: QueryParam.FONT_COLOR,
  verseAlignment: QueryParam.VERSE_ALIGNMENT,
  translationAlignment: QueryParam.TRANSLATION_ALIGNMENT,
  orientation: QueryParam.ORIENTATION,
  videoId: QueryParam.VIDEO_ID,
  surah: QueryParam.SURAH,
} as Record<keyof MediaSettings, QueryParam>;

const VideoSettings: React.FC<Props> = ({
  chaptersList,
  reciters,
  seekToBeginning,
  isFetching,
  inputProps,
  getCurrentFrame,
  mediaSettings,
}) => {
  const { lang, t } = useTranslation('quran-media-maker');
  const chaptersData = useContext(DataContext);
  const [rangesError, setRangesError] = useState(null);
  const dispatch = useDispatch();
  const router = useRouter();
  const { verseFrom, verseTo, surah } = mediaSettings;
  const removeQueryParam = useRemoveQueryParam();

  const onResetSettingsClick = useCallback(() => {
    logButtonClick('media_settings_reset');
    seekToBeginning();
    dispatch(resetToDefaults());
    removeQueryParam(Object.values(QueryParam));
  }, [dispatch, removeQueryParam, seekToBeginning]);

  const onSettingsUpdate = useCallback(
    (settings: ChangedSettings, key?: keyof MediaSettings, value?: any) => {
      if (key) {
        logValueChange(`media_settings_${key}`, mediaSettings[key], value);
      }
      seekToBeginning();
      dispatch(updateSettings(settings));
      Object.keys(settings).forEach((settingKey) => {
        const toBeUpdatedQueryParamName =
          MEDIA_SETTINGS_TO_QUERY_PARAM[settingKey as keyof MediaSettings];
        const toBeUpdatedQueryParamValue = settings[settingKey];
        router.query[toBeUpdatedQueryParamName] =
          toBeUpdatedQueryParamName === QueryParam.MEDIA_TRANSLATIONS
            ? toBeUpdatedQueryParamValue.join(',')
            : toBeUpdatedQueryParamValue;
      });
      router.push(router, undefined, { shallow: true });
    },
    [dispatch, mediaSettings, router, seekToBeginning],
  );

  const onChapterChange = (newChapter: string) => {
    const keyOfFirstVerseOfNewChapter = `${newChapter}:1`;
    onSettingsUpdate(
      {
        surah: Number(newChapter),
        verseFrom: keyOfFirstVerseOfNewChapter,
        verseTo: keyOfFirstVerseOfNewChapter,
      },
      'surah',
      newChapter,
    );
  };

  const verseKeys = useMemo(() => {
    return generateChapterVersesKeys(chaptersData, String(surah)).map((verseKey) => ({
      id: verseKey,
      name: verseKey,
      value: verseKey,
      label: toLocalizedVerseKey(verseKey, lang),
    }));
  }, [chaptersData, lang, surah]);

  const onVerseRangeChange = useCallback(
    (newSelectedVerseKey: string, verseSelectorId: RangeSelectorType) => {
      setRangesError(null);
      const isVerseKeyStartOfRange = verseSelectorId === RangeSelectorType.START;
      const startVerseKey = isVerseKeyStartOfRange ? newSelectedVerseKey : verseFrom;
      const endVerseKey = !isVerseKeyStartOfRange ? newSelectedVerseKey : verseTo;
      const validationError = validateRangeSelection(startVerseKey, endVerseKey, t);
      if (validationError) {
        setRangesError(validationError);
        return false;
      }
      if (isVerseKeyStartOfRange) {
        onSettingsUpdate(
          {
            verseTo,
            verseFrom: newSelectedVerseKey,
            surah: getChapterNumberFromKey(newSelectedVerseKey),
          },
          'verseFrom',
          newSelectedVerseKey,
        );
      } else {
        onSettingsUpdate(
          {
            verseFrom,
            verseTo: newSelectedVerseKey,
            surah: getChapterNumberFromKey(newSelectedVerseKey),
          },
          'verseTo',
          newSelectedVerseKey,
        );
      }
    },
    [onSettingsUpdate, t, verseFrom, verseTo],
  );

  const onFontScaleDecreaseClicked = () => {
    const value = mediaSettings.quranTextFontScale - 1;
    onSettingsUpdate({ quranTextFontScale: value }, 'quranTextFontScale', value);
  };

  const onFontScaleIncreaseClicked = () => {
    const value = mediaSettings.quranTextFontScale + 1;
    onSettingsUpdate({ quranTextFontScale: value }, 'quranTextFontScale', value);
  };

  const onFontColorChange = (color: string) => {
    onSettingsUpdate({ fontColor: color }, 'fontColor', color);
  };

  return (
    <>
      <RenderControls
        isFetching={isFetching}
        getCurrentFrame={getCurrentFrame}
        inputProps={inputProps}
      />
      <div
        className={classNames(
          layoutStyle.flowItem,
          layoutStyle.fullWidth,
          styles.settingsContainer,
        )}
      >
        <div>
          <Button onClick={onResetSettingsClick}>{t('common:settings.reset-cta')}</Button>
          <Section>
            <Section.Title>{t('common:surah')}</Section.Title>
            <Section.Row>
              <Section.Label>{t('common:sidebar.search-surah')}</Section.Label>
              <Select
                id="surah"
                name="surah"
                options={chaptersList || []}
                value={String(surah)}
                onChange={onChapterChange}
                disabled={isFetching}
                size={SelectSize.Small}
                className={styles.select}
              />
            </Section.Row>
            <Section.Row>
              <Section.Row>
                <VersesRangeSelector
                  dropdownItems={verseKeys}
                  rangeStartVerse={verseFrom}
                  rangeEndVerse={verseTo}
                  onChange={onVerseRangeChange}
                  isVisible
                  isDisabled={isFetching}
                />
              </Section.Row>
            </Section.Row>
            {rangesError && <div className={styles.error}>{rangesError}</div>}
          </Section>
          <ReciterSettings
            reciter={mediaSettings.reciter}
            onSettingsUpdate={onSettingsUpdate}
            reciters={reciters}
          />
          <TranslationSettingsSection
            translations={mediaSettings.translations}
            translationFontScale={mediaSettings.translationFontScale}
            onSettingsUpdate={onSettingsUpdate}
          />
        </div>
        <div>
          <Section>
            <Section.Title>{t('colors')}</Section.Title>
            <Section.Row>
              <Section.Label>{t('font-color')}</Section.Label>
              <input
                className={styles.colorPicker}
                type="color"
                value={mediaSettings.fontColor}
                onChange={(e) => onFontColorChange(e.target.value)}
              />
            </Section.Row>
          </Section>
          <Section>
            <Section.Title>{t('common:fonts.quran-font')}</Section.Title>
            <Section.Row>
              <Section.Label>{t('common:fonts.font-size')}</Section.Label>
              <Counter
                count={mediaSettings.quranTextFontScale}
                onDecrement={
                  mediaSettings.quranTextFontScale === MINIMUM_FONT_STEP
                    ? null
                    : onFontScaleDecreaseClicked
                }
                onIncrement={
                  mediaSettings.quranTextFontScale === MAXIMUM_QURAN_FONT_STEP
                    ? null
                    : onFontScaleIncreaseClicked
                }
              />
            </Section.Row>
          </Section>
          <OrientationSettings
            orientation={mediaSettings.orientation}
            onSettingsUpdate={onSettingsUpdate}
          />
        </div>
        <div>
          <AlignmentsSettings
            verseAlignment={mediaSettings.verseAlignment}
            translationAlignment={mediaSettings.translationAlignment}
            onSettingsUpdate={onSettingsUpdate}
          />
          <Section>
            <Section.Title>{t('video-picker')}</Section.Title>
            <Section.Row>
              <BackgroundVideos
                videoId={mediaSettings.videoId}
                onSettingsUpdate={onSettingsUpdate}
              />
            </Section.Row>
          </Section>
        </div>
      </div>
    </>
  );
};

export default VideoSettings;
