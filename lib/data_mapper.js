// *****************************************************************************
// Copyright 2016-2017 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License")
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

'use strict'

class DataMapper {
  /**
   * Converts a session object into a database record.
   *
   * @param {Object} session - session object
   * @returns {Object} Aerospike database record
   */
  toRecord (session) {
    return {
      session: JSON.stringify(session)
    }
  }

  /**
   * Converts a database record into a session object.
   *
   * @param {Object} record - Aerospike record bins
   * @param {Object} session object
   */
  fromRecord (record) {
    const sessionBin = record.session
    if (!sessionBin) return null
    return JSON.parse(sessionBin)
  }
}

module.exports = DataMapper
