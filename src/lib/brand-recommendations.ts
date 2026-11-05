/**
 * 2026-11-05 공개 상품 4,534건 제목·본문 감사에서 검토한 관리용 대표명/검색 별칭입니다.
 * 자동 등록하지 않으며 현재 데이터와 대조한 미리보기와 명시적인 UI 확인 후 적용합니다.
 * 법적 회사 동일성이나 상품 모델명 일괄 치환을 뜻하지 않습니다.
 */
export interface BrandRecommendation {
  name: string;
  aliases: string[];
  note?: string;
  exampleUrl?: string;
}
export interface BrandReviewItem {
  name: string;
  aliases: string[];
  reason: string;
  exampleUrl?: string;
  sourceUrls?: string[];
}

export const confirmedBrandRecommendations: BrandRecommendation[] = [
  {
    "name": "동일레저",
    "aliases": [
      "동일",
      "동일레져"
    ],
    "note": "공식 상호 동일레저 확인. 같은 상품 제목의 동일레져/동일을 본문에서 동일레저로 명시. 단순 레저 일괄치환이 아니라 해당 상호의 약칭/오기를 연결.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793504211802-Syp8savG"
  },
  {
    "name": "탑레져",
    "aliases": [
      "탑레저"
    ],
    "note": "공식 브랜드 표기는 탑레져. 제목 [탑레져] 크랭크의 본문은 탑레저, 제목 [탑레저] 마스터 받침틀의 본문은 탑레져.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1792990740891-d5vNfRzY"
  },
  {
    "name": "단레져",
    "aliases": [
      "단레저"
    ],
    "note": "공식 도메인 검색 색인에서 단레져 확인. 직접 페이지 조회는 제한됨. 제목 [단레져] 올려놔 선반의 본문은 단레저, [단레저] 올려놔 선반 상품도 존재.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793501257428-ZRxawzr3"
  },
  {
    "name": "청수레져",
    "aliases": [
      "청수",
      "청수레저",
      "청수레져사"
    ],
    "note": "공식 사이트에서 청수레저·청수레져 병용. 관리용 대표 표기는 청수레져로 제안. [청수] 솟대연결대의 본문에 청수레져, [청수레져] 칸 선반/받침틀 본문에 청수레저가 명시. 회사 지칭 접미사 차이.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1790733108868-jv46btXL"
  },
  {
    "name": "우경",
    "aliases": [
      "우경레저",
      "우경레져"
    ],
    "note": "[우경] 5단 받침틀의 본문에 우경레져, [우경레저] 10단 본문에 우경레져, [우경레져] 3단 본문에 우경레저가 명시.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793168878346-jbmdBbQm"
  },
  {
    "name": "아피스",
    "aliases": [
      "APIS",
      "APIS사",
      "아피스사"
    ],
    "note": "[APIS] 오뚜기 받침틀 본문에 아피스 명시. 동일 천년지기 상품군의 한글·영문/접미사 차이. 한글 대표명은 관리용 추천안.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1792655876657-AclMyeRx"
  },
  {
    "name": "이스케이프",
    "aliases": [
      "ESC",
      "이스케이프사"
    ],
    "note": "[ESC] 에버텐/빅스페이스 좌대 본문에 이스케이프를 직접 명시. 회사 지칭 접미사 차이. ESC도 같은 제품군에서 확인.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793685214811-9jjzsoPd"
  },
  {
    "name": "DK피싱",
    "aliases": [
      "DK 피싱",
      "Dk피싱"
    ],
    "note": "같은 독조 상품군 제조사 소개에 사용되는 대소문자·띄어쓰기 차이.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1788667573770-mtavem"
  },
  {
    "name": "JS컴퍼니",
    "aliases": [
      "JS 컴퍼니"
    ],
    "note": "같은 빅소드·닉스팝 상품군 제조사 소개의 띄어쓰기 차이.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1788401550473--go21S"
  },
  {
    "name": "DIF",
    "aliases": [
      "DIF사",
      "Dif사"
    ],
    "note": "영문 대소문자와 회사 지칭 접미사 정리. ‘체어맨’은 모델군으로 분리.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793500123717-H5H0_zZj"
  },
  {
    "name": "은성",
    "aliases": [
      "은성사"
    ],
    "note": "은성/은성사는 같은 수파·명파·수향 등 상품군 제조사 소개에 사용. ‘사’는 회사 지칭 접미사이며 본문 표현을 브랜드명 별칭으로만 보관.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793500697142-Z1-bnt95"
  },
  {
    "name": "천류",
    "aliases": [
      "천류사"
    ],
    "note": "천류/천류사가 같은 설화수·소야·천향 등 제조사 소개에 사용.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793771186598-XyjBPebh"
  },
  {
    "name": "KD조구",
    "aliases": [
      "KD",
      "KD 조구",
      "KD 조구사",
      "KD조구사",
      "Kd조구사"
    ],
    "note": "[KD] 접이식 소좌/극선2 좌대의 본문에 KD 조구/KD조구를 명시. 구체적인 제품 문맥에서 KD조구를 지칭. 단독 KD 영문은 다른 문맥에 일괄 치환하지 말고 상품별 명시 근거로 연결.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793589008925-qcx3kEOU"
  },
  {
    "name": "강원산업",
    "aliases": [
      "강원 산업",
      "강원"
    ],
    "note": "동일 록시·자수정·클라우드 상품군의 띄어쓰기 차이.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793495037599-_z-30NKs"
  },
  {
    "name": "송원산업",
    "aliases": [
      "송원",
      "송원 산업"
    ],
    "note": "독야 상품군 제조사. ‘송원’은 약칭으로 보관, 긴 대표명은 관리용 추천안.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1792996744049-3tllWDzY"
  },
  {
    "name": "판야",
    "aliases": [
      "판야레져"
    ],
    "note": "[판야] 소좌용 2단 받침틀의 본문에 판야레져를 명시.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793769768398-JOLj-pY4"
  },
  {
    "name": "캠핑솔루션",
    "aliases": [
      "캠핑 솔루션"
    ],
    "note": "동일 상품 제목과 본문의 띄어쓰기 차이.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793340847264-8fnTH3kb"
  },
  {
    "name": "새론불",
    "aliases": [
      "새론불 산업",
      "새론불 상사",
      "새론불산업"
    ],
    "note": "같은 브랜드의 회사 지칭/띄어쓰기 후보. 산업과 상사를 공식명처럼 단정하지 않고 원표기를 별칭으로 남김.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793005552865-a5NfniCn"
  },
  {
    "name": "DSP",
    "aliases": [
      "DSP 컴퍼니",
      "DSP컴퍼니"
    ],
    "note": "상품 제조사 소개의 영문명·회사명 및 띄어쓰기 차이.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1792893623411-GnPYuqCQ"
  },
  {
    "name": "스마트상사",
    "aliases": [
      "스마트",
      "스마트 상사"
    ],
    "note": "[스마트] 좌대/자립발판 본문에서 스마트상사를 명시. 스마트 상사 띄어쓰기 형태도 존재. 띄어쓰기 차이는 통일 가능. 단독 스마트는 일반 형용사/모델명과 겹칠 수 있으므로 해당 좌대·받침틀 제조사 문맥에서만 연결.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1785997885976-n0A4vt"
  },
  {
    "name": "라프",
    "aliases": [
      "LAF"
    ],
    "note": "[LAF] 벙커2 제목의 본문에 라프 벙커2를 직접 명시.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1792737807926-AR-FAyh5"
  },
  {
    "name": "해동조구사",
    "aliases": [
      "해동",
      "해동 조구사",
      "해동조구"
    ],
    "note": "심해은갈치·스몰 옥토퍼스 등 같은 제조사 소개의 약칭·공백·회사 지칭 차이.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1791875929298-VYjFjhNf"
  },
  {
    "name": "한돌상사",
    "aliases": [
      "한돌"
    ],
    "note": "[한돌] 땅꽂이/타스 뜰채 본문에 한돌상사를 직접 명시.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1791075432316-OlD3Ev7i"
  },
  {
    "name": "NS",
    "aliases": [
      "N.S",
      "NS 블랙홀",
      "NS블랙홀",
      "NS사",
      "Ns사"
    ],
    "note": "[N.S] 해검/다크호스2 로드 본문에 NS 명시. NS는 본문 표기이며 제목 괄호 건수 0인 별도 관찰값. 같은 허리케인·다크호스·타이픈·실크로드 상품군. NS/N.S 대소문자·마침표를 통일하며 블랙홀은 보조 표기로 보존.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793676117405-zRUjDv_O"
  },
  {
    "name": "체리피시",
    "aliases": [
      "체리피쉬"
    ],
    "note": "공식 회사명 체리피시 확인. 듀벡스는 별도 계열. 공식몰 회사명은 체리피시. 듀벡스는 별도 브랜드·제품계열로 보존합니다.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1790669028416-fbP9Q3aN"
  },
  {
    "name": "MJ피닉스",
    "aliases": [
      "MJ 피닉스"
    ],
    "note": "동일 MJ피닉스/MJ 피닉스의 공백만 다른 표기이며 제목 [MJ피닉스] 알루미늄 텐트 본문에 MJ 피닉스 명시. 별도 [피닉스] 받침틀은 이 그룹으로 자동 통합하지 않음.",
    "exampleUrl": "https://fishjoongo.com/posts/170683606"
  },
  {
    "name": "OK",
    "aliases": [
      "O.K"
    ],
    "note": "[O.K] 튜닝 받침틀 본문에 OK를 명시. 구두점 차이만 묶고 오케이/동진기업의 회사·상품명 관계는 별도 검토.",
    "exampleUrl": "https://fishjoongo.com/posts/170459177"
  },
  {
    "name": "BJ컴퍼니",
    "aliases": [
      "BJ",
      "BJ 사",
      "BJ 컴퍼니",
      "BJ조구사",
      "BJ 비제이"
    ],
    "note": "백작 마스터 로드/레이서/리미티드 상품군에서 같은 제조사로 소개. ‘BJ백작/BJ 백작’은 브랜드와 모델군이 섞인 표기라 백작을 모델명으로 분리.",
    "exampleUrl": "https://fishjoongo.com/posts/170183440"
  },
  {
    "name": "애경조구",
    "aliases": [
      "애경 조구",
      "애경조구사"
    ],
    "note": "갱진일보 등 제조사 소개의 띄어쓰기/회사 지칭 접미사 차이.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1792560470999-X60NPEa9"
  },
  {
    "name": "오리엔탈피싱",
    "aliases": [
      "오리엔탈"
    ],
    "note": "Saker Claw 상품의 제목 [오리엔탈]과 본문 오리엔탈피싱이 직접 연결됨.",
    "exampleUrl": "https://fishjoongo.com/posts/164944218"
  },
  {
    "name": "행복한낚시",
    "aliases": [
      "행복한 낚시"
    ],
    "note": "동일 명칭의 띄어쓰기 차이.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1790404982744-gZSt6rJ0"
  },
  {
    "name": "DH레포츠",
    "aliases": [
      "DH 레포츠",
      "DH사",
      "DH"
    ],
    "note": "맹호·맹호 진 상품군 제조사. 대문자 DH 및 공백을 관리용 대표명으로 정리.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793495124048-lcuvVMN8"
  },
  {
    "name": "JK",
    "aliases": [
      "JK 조구사"
    ],
    "note": "아이테르 리멤버 상품군 제조사 소개. 조구사는 회사 지칭 접미사.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1791074701615-H6qSH3jh"
  },
  {
    "name": "동와레포츠",
    "aliases": [
      "동와"
    ],
    "note": "동와의 기록·수보·무한과 동와레포츠 표기. 브랜드 대표명 길이 선택은 관리 정책에 따라 동와로 줄여도 됨.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1792987649031-p29d7Pnw"
  },
  {
    "name": "머털낚시",
    "aliases": [
      "머털낚싱"
    ],
    "note": "머털낚싱은 장독대 새털 본문에서 1회 관찰된 한 글자 오타 후보. 동일 모델군 근거가 강함.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793611301462-pjTlZiwt"
  },
  {
    "name": "영규산업",
    "aliases": [
      "영규산"
    ],
    "note": "영규산은 고죽 본문 1회에서 회사명 뒷글자가 빠진 표기. 영규산업으로 연결할 후보.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1792737286571-jXuhkkM4"
  },
  {
    "name": "웅진레포츠",
    "aliases": [
      "웅진"
    ],
    "note": "적운 등 동일 제조사 소개의 약칭.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1780022877787-HS5lNP"
  },
  {
    "name": "해원레포츠",
    "aliases": [
      "해원",
      "해원 레포츠",
      "해원사"
    ],
    "note": "제왕 상품군의 약칭·띄어쓰기·사 접미사 차이.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1790836741529-p4K6krKd"
  }
];

export const brandReviewPending: BrandReviewItem[] = [
  {
    "name": "호봉레져",
    "aliases": [
      "호봉",
      "호봉레저",
      "호봉레져"
    ],
    "reason": "같은 제품에서 호봉·호봉레저·호봉레져가 함께 발견됐습니다. 제품 로고·라벨에서 사용할 대표 철자를 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1792894295839-YzlOsldM"
  },
  {
    "name": "레져다오",
    "aliases": [
      "레저다오",
      "레져다오"
    ],
    "reason": "같은 텐트 제품에서 레저다오·레져다오가 함께 발견됐습니다. 제품 로고·라벨에서 사용할 대표 철자를 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793695086527-v3MkoYWZ"
  },
  {
    "name": "승일레져",
    "aliases": [
      "승일",
      "승일레저",
      "승일레져"
    ],
    "reason": "같은 하나로 각도기에서 승일·승일레저·승일레져가 함께 발견됐습니다. 제품 로고·라벨에서 사용할 대표 철자를 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1792033737813-g7Pc0TP2"
  },
  {
    "name": "늘푸른레저",
    "aliases": [
      "늘푸른레저",
      "늘푸른레져"
    ],
    "reason": "같은 반하리 좌대에서 늘푸른레저·늘푸른레져가 함께 발견됐습니다. 제품 로고·라벨에서 사용할 대표 철자를 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1790754145334-ZvYKjfwr"
  },
  {
    "name": "일또낚",
    "aliases": [
      "일또낙",
      "일또낚"
    ],
    "reason": "같은 리얼트리 매트에서 일또낚·일또낙이 함께 발견됐습니다. 제품 로고·라벨에서 낚·낙 중 사용할 대표 철자를 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1791359844728-GCK905N6"
  },
  {
    "name": "제우스레져",
    "aliases": [
      "제우스 레져",
      "제우스레저",
      "제우스레져"
    ],
    "reason": "레저·레져 중 사용할 대표 철자와 기존 동일명 브랜드 2개의 연결 제품을 확인해주세요. 기존 2개는 삭제하거나 합치지 않았습니다.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1790821503037-Oi8Z38le"
  },
  {
    "name": "대륙 / 대륙프로피싱",
    "aliases": [
      "대륙",
      "대륙기업",
      "대륙프로피싱"
    ],
    "reason": "대륙·대륙기업과 대륙프로피싱을 같은 업체로 확인하지 못했습니다. 제품 라벨에서 제조사와 브랜드를 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1782116047703-dPyak0",
    "sourceUrls": [
      "https://fishjoongo.com/posts/170458609",
      "https://fishjoongo.com/posts/170438600"
    ]
  },
  {
    "name": "오케이 / 동진기업 ↔ OK",
    "aliases": [
      "오케이",
      "동진기업"
    ],
    "reason": "OK·O.K는 등록했지만 오케이·동진기업과의 연결은 보류했습니다. 제품 라벨에서 같은 브랜드인지, 회사명이나 모델명인지 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1792387608625-OicDMSKV",
    "sourceUrls": [
      "https://fishjoongo.com/posts/159404498",
      "https://fishjoongo.com/posts/170459177"
    ]
  },
  {
    "name": "대물낚시300일",
    "aliases": [
      "300days",
      "대물낚시300일"
    ],
    "reason": "300days와 대물낚시300일에 비슷한 코모도 텐트가 있지만 같은 브랜드인지 확인이 필요합니다. 제품 로고·라벨을 비교해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1786083385827-4mK2PQ",
    "sourceUrls": [
      "https://fishjoongo.com/posts/158028009"
    ]
  },
  {
    "name": "백조상사",
    "aliases": [
      "백조",
      "백조상사"
    ],
    "reason": "백조·백조상사가 같은 가방 브랜드인지 확인이 필요합니다. 제품 라벨에서 제조사를 확인하고, 윙스타와의 관계도 구분해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793080335870-MgV4ScsD",
    "sourceUrls": [
      "https://fishjoongo.com/posts/manual-1787883846386-wI5MrI"
    ]
  },
  {
    "name": "성우이엔씨",
    "aliases": [
      "성우",
      "성우이엔씨"
    ],
    "reason": "성우·성우이엔씨 모두 푸른숲 각도기에 쓰이지만 같은 업체라는 근거가 부족합니다. 제품 라벨의 제조사를 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793089249223-aFjTbi_h",
    "sourceUrls": [
      "https://fishjoongo.com/posts/169470786",
      "https://fishjoongo.com/posts/manual-1793088694322-zpkYpd6p"
    ]
  },
  {
    "name": "하이레저",
    "aliases": [
      "하이레저",
      "하이레져"
    ],
    "reason": "하이레저·하이레져 좌대의 규격은 비슷하지만 같은 브랜드인지 확인이 필요합니다. 제품 로고·라벨에서 대표 철자를 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1788848613718-vMnHeE",
    "sourceUrls": [
      "https://fishjoongo.com/posts/167607352"
    ]
  },
  {
    "name": "비바 / 비바피싱 / 비바보트",
    "aliases": [
      "비바",
      "비바피싱",
      "비바보트"
    ],
    "reason": "에어매트·가방·보트에 각각 다른 이름이 쓰여 같은 업체로 묶지 않았습니다. 제품 라벨에서 제조사와 브랜드를 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1789092179802-6HrgZC8r",
    "sourceUrls": [
      "https://fishjoongo.com/posts/170255522",
      "https://fishjoongo.com/posts/168709344"
    ]
  },
  {
    "name": "피쉬베스트 (확인 후 통일)",
    "aliases": [
      "피쉬베스트",
      "피시베스트"
    ],
    "reason": "같은 의자에 피시베스트·피쉬베스트가 쓰이지만 공식 철자는 미확정입니다. 제품 로고를 확인하고, 크랭크의 제조사와 제품명도 구분해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1792634740991-4GMzlJ71",
    "sourceUrls": [
      "https://www.11st.co.kr/products/103868393",
      "https://fishjoongo.com/posts/manual-1792374094514-qYZTHHTw",
      "https://fishjoongo.com/posts/manual-1785317241090-3QFDHF"
    ]
  },
  {
    "name": "나우피싱",
    "aliases": [
      "나우피싱",
      "세븐피싱"
    ],
    "reason": "세븐피싱은 나우피싱의 예전 이름으로 소개돼 철자 오류와 구분해야 합니다. 과거 상품 이름을 유지하면서 검색 별칭으로 연결할지 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1786952839869-PpLx3w",
    "sourceUrls": [
      "https://nowfishing.net/",
      "https://fishjoongo.com/posts/170825296",
      "https://fishjoongo.com/posts/168667965"
    ]
  },
  {
    "name": "다잡캠핑",
    "aliases": [
      "다잡",
      "다잡캠핑"
    ],
    "reason": "다잡·다잡캠핑 에어매트의 규격은 같지만 같은 브랜드라는 근거가 부족합니다. 제품 로고·라벨에서 대표 이름을 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793608114093-pDGgQDrc",
    "sourceUrls": [
      "https://fishjoongo.com/posts/manual-1780557578303-uI7O2Y"
    ]
  },
  {
    "name": "씨마 / 씨마플러스",
    "aliases": [
      "씨마",
      "씨마플러스"
    ],
    "reason": "가방에 씨마·씨마플러스가 각각 쓰이지만 같은 업체인지 확인하지 못했습니다. 제품 로고·라벨에서 두 이름의 관계를 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1791364806728-qpYBQvzZ",
    "sourceUrls": [
      "https://fishjoongo.com/posts/manual-1782011303341-Zvbpna"
    ]
  },
  {
    "name": "히든 / 히든피싱",
    "aliases": [
      "히든",
      "히든피싱"
    ],
    "reason": "히든은 가방, 히든피싱은 선반에서 발견돼 같은 브랜드로 묶지 않았습니다. 제품 라벨에서 제조사를 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1788506488528-9Xfhng",
    "sourceUrls": [
      "https://fishjoongo.com/posts/manual-1782984693835-eSZdgG"
    ]
  },
  {
    "name": "거명 / 거명산업",
    "aliases": [
      "거명",
      "거명산업"
    ],
    "reason": "KM7 와인경조에서는 두 이름이 같은 제조사를 가리킵니다. 적토마 수초제거대까지 같은 업체인지 제품 라벨을 확인한 뒤 전체 연결을 결정해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1790672435397-6Frp7fKS",
    "sourceUrls": [
      "https://m.e-this.co.kr/goods/goods_list.php?brandCd=031",
      "https://fishjoongo.com/posts/manual-1790668069860-lMPyzCgo"
    ]
  },
  {
    "name": "삼우빅케치",
    "aliases": [
      "삼우빅케치",
      "삼우 빅캐치",
      "삼우 빅캐치사"
    ],
    "reason": "삼우빅케치·삼우 빅캐치가 함께 쓰이지만 대표 철자는 미확정입니다. 제품 로고·보증서에서 빅케치·빅캐치 중 사용할 이름을 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1789609924680-cLW5VqrP",
    "sourceUrls": [
      "https://fishjoongo.com/posts/manual-1781667418978-PGpnpJ",
      "https://fishjoongo.com/posts/manual-1781330503560-4FsXqo",
      "https://fishjoongo.com/posts/169496322",
      "https://fishjoongo.com/posts/153514439"
    ]
  },
  {
    "name": "선FC",
    "aliases": [
      "선FC",
      "SUN FC"
    ],
    "reason": "선FC·SUN FC가 같은 브랜드인지 확인이 필요합니다. 제품 로고·보증서에서 한글·영문 이름이 함께 쓰이는지 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1792652658950-0RmWiGQg",
    "sourceUrls": [
      "https://fishjoongo.com/posts/157915744"
    ]
  },
  {
    "name": "로구만 / 로구맨",
    "aliases": [
      "로구만",
      "로구맨"
    ],
    "reason": "서로 다른 루어대에 로구만·로구맨이 쓰여 같은 브랜드로 묶지 않았습니다. 제품 로고·보증서에서 제조사와 대표 철자를 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/170475175",
    "sourceUrls": [
      "https://fishjoongo.com/posts/17843251"
    ]
  },
  {
    "name": "릿찌 / 릿지",
    "aliases": [
      "릿찌",
      "릿지",
      "릿지찌",
      "reet",
      "Reet"
    ],
    "reason": "릿찌·릿지·릿지찌가 같은 전자찌 브랜드인지 확인이 필요합니다. 제품 사진의 REET 로고와 한글 표기를 비교해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793760310293-l5B1pHmC",
    "sourceUrls": [
      "https://xn--hq1b59ivsguna.com/",
      "https://fishjoongo.com/posts/167246340",
      "https://fishjoongo.com/posts/manual-1793759904203-ogSmn5TZ",
      "https://fishjoongo.com/posts/156330140"
    ]
  },
  {
    "name": "센스엔텍 / 센스앤텍",
    "aliases": [
      "센스엔텍",
      "센스앤텍"
    ],
    "reason": "제너스 제품에 두 표기가 쓰이지만 회사명과 브랜드명이 다를 가능성이 있습니다. 제품 로고·포장·보증서에서 사용할 이름을 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1785997687411-queTkY",
    "sourceUrls": [
      "https://www.saramin.co.kr/zf_user/company-info/view/csn/M25mK08zVVRtYVFIbkNqQnZnNUhkdz09/company_nm/%EC%84%BC%EC%8A%A4%EC%97%94%ED%85%8D",
      "https://fishjoongo.com/posts/manual-1783058690063-_5aS6A"
    ]
  },
  {
    "name": "유양산업",
    "aliases": [
      "유양",
      "유양산업",
      "유양조구사"
    ],
    "reason": "유양·유양산업·유양조구사가 같은 업체의 약칭이나 옛 이름인지 확인이 필요합니다. 제품 라벨·보증서에서 제조사를 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1782957081115-LCe3oN",
    "sourceUrls": [
      "https://fishjoongo.com/posts/manual-1778997947007-D0TWNO",
      "https://fishjoongo.com/posts/153542057",
      "https://fishjoongo.com/posts/16911085",
      "https://fishjoongo.com/posts/16910961"
    ]
  },
  {
    "name": "영상산업 / 영규산업",
    "aliases": [
      "영상산업",
      "영규산업"
    ],
    "reason": "영규산업은 등록했지만 영상산업의 별칭 연결은 보류했습니다. 보라매 챔피언십 제품 라벨·보증서에서 제조사를 확인해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/167963259"
  },
  {
    "name": "봄향기 제조사 구분",
    "aliases": [
      "봄향기"
    ],
    "reason": "봄향기 좌대는 봄팩토리 제품이지만 회전의자의 제조사는 확인되지 않았습니다. 의자 라벨을 확인한 뒤 같은 브랜드로 묶을지 결정해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/manual-1793695214766-HLnVh3KR",
    "sourceUrls": [
      "https://fishjoongo.com/posts/manual-1791592777039-5yzjp91W"
    ]
  },
  {
    "name": "소야 제조사 구분",
    "aliases": [
      "소야"
    ],
    "reason": "소야는 찌와 낚시대에서 서로 다른 제조사·인물 이름과 함께 쓰입니다. 제품별 제조사를 확인해 한 브랜드로 일괄 연결하지 않도록 해주세요.",
    "exampleUrl": "https://fishjoongo.com/posts/170596819",
    "sourceUrls": [
      "https://fishjoongo.com/posts/manual-1781938739337-lc2Qni"
    ]
  }
];
