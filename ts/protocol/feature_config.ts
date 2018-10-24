/*
 * Copyright 2017 The OpenYOLO for Web Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @file Specifies the feature related configurations that can be sent to the
 * provider as an initial URL parameter. This allows relying parties to turn
 * ON/OFF certain whitelisted features on session basis. Not all features can
 * be controlled in this way depending on the provider's decision. And use of
 * this configuration must be consulted with the provider.
 */

export interface FeatureConfig { feature: string[]; }
