# 2026-11-17 리뷰 (19차: AI `routine_feedback` 삭제 포함, 삭제 배치 최종 점검)

대상
- BE `WithdrawnUserDataPurger`: `tableExists`(JDBC `DatabaseMetaData.getTables`), `routine_feedback` 삭제
- 새 테스트 `purgeExpired_alsoRemovesAiRoutineFeedbackWhenTheTableExists`
- AI `fit-core-ai/models/routine_feedback.py`, `engines/schemas.py` `RoutineFeedbackRequest`, `main.py` `/api/ai/routine-feedback`(읽기만)

**결과: P0 0건, P1 0건, P2 1건.**
- 18차 P2(`routine_feedback`이 삭제되지 않음)는 `user_id`가 있는 행에 대해서는 해결됐습니다.
- `user_id` 없이 저장된 행이 남는 좁은 경우가 남았습니다(P2-1). 지금은 이 엔드포인트를 쓰는 곳이 없어 실제 영향은 없습니다.

## 자동 검증

| 항목 | 결과 |
|---|---|
| BE `./gradlew test --rerun-tasks` | BUILD SUCCESSFUL. 테스트 결과 XML 기준 146건, 실패 0 |
| 새 테스트 | 테이블을 만들고, 만료 사용자의 피드백은 삭제되고 활성 사용자의 피드백은 남는지 확인한 뒤 테이블을 삭제함 |

## MariaDB 특성 확인

**`getTables(connection.getCatalog(), null, name, {"TABLE"})`**
- MariaDB Connector/J는 기본값(`useCatalogTerm=Catalog`)에서 데이터베이스를 catalog로 다룹니다.
  - 그래서 `getCatalog()`는 현재 DB(`fit_core`)를 돌려주고, 같은 DB 안에서만 찾습니다.
  - `useCatalogTerm=Schema`로 바꾸면 catalog가 null이 되어 다른 DB의 같은 이름 테이블까지 잡을 수 있습니다. 지금 JDBC URL(`jdbc:mariadb://…/fit_core`)에는 그런 옵션이 없습니다.
- 대소문자
  - SQLAlchemy가 만드는 이름은 소문자 `routine_feedback`이고, DELETE 문도 소문자입니다.
  - Linux의 `lower_case_table_names=0`(대소문자 구분)에서도 일치합니다.
  - 대문자로 다시 찾는 것은 H2를 위한 것이며 MariaDB에는 해가 없습니다.
- `tableNamePattern`의 `_`
  - `_`는 LIKE 와일드카드라 `routine1feedback` 같은 이름과도 맞을 수 있습니다.
  - 그런 테이블은 없으므로 실제 위험은 없습니다.
  - 만약 잘못 참으로 판정되면 DELETE가 실패하고, 그 사용자는 롤백된 뒤 다음 날 다시 시도합니다. 데이터는 지워지지 않고 남으므로 안전한 쪽으로 실패합니다.
- 트랜잭션
  - 존재 확인은 같은 커넥션(같은 트랜잭션)에서 하고, DELETE는 FK 순서 단계보다 먼저 같은 사용자 트랜잭션 안에서 실행됩니다.
  - `routine_feedback`에는 FK가 없어 순서 문제가 없습니다.

## 삭제 배치 전체 최종 점검 (18차 결론 유지)

| 항목 | 상태 |
|---|---|
| 활성 사용자, 다시 가입한 사용자 오삭제 | 불가. `is_deleted=1`과 `deleted_at` 조건을 조회·재확인·마지막 DELETE에서 세 번 확인하고, `is_deleted`를 1로 만드는 경로는 탈퇴뿐 |
| BE 사용자 테이블 | 8개와 하위 3개 모두 포함, FK 순서 맞음 |
| AI 테이블 | `routine_feedback` 포함(`user_id` 기준) |
| 부분 실패 | 사용자마다 트랜잭션 → 롤백, 다음 날 다시 시도 |
| 기본값이 켜져 있는 위험 | 낮음(18차와 같음) |
| 문구 "운동·식단·루틴 기록, 탈퇴 기록, 익명 계정까지 모두 완전히 지워요" | 회원 계정에 연결된 데이터 기준으로 맞음. 예외는 아래 P2-1 |

---

## P2 — 개선

### P2-1. `user_id` 없이 저장된 `routine_feedback` 행은 탈퇴 사용자의 루틴을 가리켜도 남음

**원인**
- `RoutineFeedbackRequest.user_id`는 선택값(`Optional`, 호출자가 넣는 자유 문자열)입니다.
- `routine_draft_id`는 필수이고, `user_note`(자유 메모)도 저장됩니다.
- 배치는 `WHERE user_id = :userId`로만 지웁니다.

**남는 경우**
- 나중에 BE가 피드백을 전달하면서 `user_id`를 빼고 `routine_draft_id`만 넘기는 경우
- 또는 BE의 UUID가 아닌 다른 식별자(이메일 등)를 넣는 경우

이때 탈퇴 사용자의 드래프트에 달린 피드백(메모 포함)이 30일이 지나도 남고, 방침의 "모두 완전히 지워요"와 달라집니다.

**지금 영향**
- BE에는 `/api/ai/routine-feedback` 호출 코드가 없어 사용자 흐름으로는 행이 생기지 않습니다.

**기대**
- 삭제 조건을 다음처럼 넓힙니다. 이 DELETE는 `routine_drafts`를 지우기 전에 실행돼야 하며, 지금 위치(FK 단계보다 먼저)가 그 조건을 만족합니다.

  ```sql
  DELETE FROM routine_feedback
   WHERE user_id = :userId
      OR routine_draft_id IN (SELECT routine_draft_id FROM routine_drafts WHERE user_id = :userId)
  ```
- 또는 AI 피드백 계약에서 `user_id`를 BE `user_id`(UUID)로 필수로 정합니다.

## 참고 (건수에 넣지 않음)
- 로그의 userId와 DB 백업 보관 기간 문구는 18차 참고와 같습니다(법무 확인 권장).
