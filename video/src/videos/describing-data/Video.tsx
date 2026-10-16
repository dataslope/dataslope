import React from "react";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";

/** Placeholder for Statistics Unit 2: the series intro alone. */
export const DescribingData: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <SeriesIntro course="Statistics for Data Science with Python" unit="Unit 2" title="Describing data" />
  </EditorialPage>
);
